/**
 * G4 Contract lifecycle: accept, complete, verify, dispute.
 * requested → accepted → working → delivered → verified → completed
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { publishEvent, EventTypes } from "@/lib/event-bus";
import { logAudit } from "@/lib/audit";

const VALID_TRANSITIONS: Record<string, string[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["working", "cancelled"],
  working: ["delivered", "disputed"],
  delivered: ["verified", "completed", "disputed"],
  verified: ["completed"],
};

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { action: string; actual_output?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = String(body?.action ?? "").toLowerCase();
  const allowed = ["accept", "complete", "verify", "dispute", "cancel"];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    accept: "accepted",
    complete: "delivered",
    verify: "verified",
    dispute: "disputed",
    cancel: "cancelled",
  };
  const newStatus = statusMap[action];

  const { rows: contracts } = await query<{ status: string; seller_loop_id: string; stripe_payment_id: string | null }>(
    "SELECT status, seller_loop_id, stripe_payment_id FROM loop_contracts WHERE id = $1",
    [id]
  );
  if (contracts.length === 0) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const current = contracts[0];
  const allowedNext = VALID_TRANSITIONS[current.status];
  if (!allowedNext || !allowedNext.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${current.status} to ${newStatus}` }, { status: 400 });
  }

  if (action === "complete" && body.actual_output != null) {
    await query(
      "UPDATE loop_contracts SET status = $1, actual_output = $2, updated_at = NOW() WHERE id = $3",
      [newStatus, JSON.stringify(body.actual_output), id]
    );
  } else {
    await query(
      "UPDATE loop_contracts SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, id]
    );
  }

  await logAudit({ actorType: "loop", actorId: session.loopId, action: "contract_action", resourceType: "contract", resourceId: id, metadata: { action, newStatus } });

  // On verify → complete, release Stripe payout, notify parties, update trust
  if (newStatus === "verified") {
    await query("UPDATE loop_contracts SET status = 'completed', updated_at = NOW() WHERE id = $1", [id]);
    await publishEvent(EventTypes.CONTRACT_COMPLETED, { contractId: id, sellerLoopId: current.seller_loop_id });

    // Release Stripe payout if payment was held
    if (current.stripe_payment_id) {
      const { releasePayout } = await import("@/lib/payments");
      const sellerRes = await query<{ stripe_account_id: string | null }>(
        "SELECT stripe_account_id FROM loops WHERE id = $1", [current.seller_loop_id]
      ).catch(() => ({ rows: [] }));
      const sellerStripeId = (sellerRes.rows[0] as { stripe_account_id?: string | null })?.stripe_account_id;
      if (sellerStripeId) releasePayout(id, sellerStripeId).catch(console.error);
    }

    // Update trust scores for both parties
    const contractFull = await query<{ buyer_loop_id: string; reward_amount_cents: number }>(
      "SELECT buyer_loop_id, reward_amount_cents FROM loop_contracts WHERE id = $1", [id]
    ).catch(() => ({ rows: [] }));
    const c = contractFull.rows[0];
    if (c) {
      for (const loopId of [c.buyer_loop_id, current.seller_loop_id]) {
        const lr = await query<{ trust_score: number }>("SELECT trust_score FROM loops WHERE id = $1", [loopId]);
        const prev = lr.rows[0]?.trust_score || 0;
        await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [Math.min(100, prev + 2), loopId]);
      }

      // Record in seller wallet
      const platformFee = Math.round((c.reward_amount_cents || 0) * 0.1);
      const net = (c.reward_amount_cents || 0) - platformFee;
      if (net > 0) {
        await query(
          `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
           VALUES ($1, 'deal', $2, $3, $4, 'Contract completed', 'system')`,
          [current.seller_loop_id, c.reward_amount_cents, platformFee, net]
        ).catch(() => {});
      }

      // Post to feed
      await query(
        "INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'deal')",
        [current.seller_loop_id, `Contract completed and verified ✓ #${id.slice(0, 8)}`]
      ).catch(() => {});
    }
  }

  const { rows: updated } = await query<Record<string, unknown>>(
    "SELECT * FROM loop_contracts WHERE id = $1",
    [id]
  );
  return NextResponse.json(updated[0]);
}
