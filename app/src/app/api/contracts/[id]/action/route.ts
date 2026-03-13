/**
 * G4 Contract lifecycle: accept, complete, verify, dispute.
 * requested → accepted → working → delivered → verified → completed
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { publishEvent, EventTypes } from "@/lib/event-bus";

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

  // On verify → mark completed and publish event. Payout via releasePayout() when Stripe Connect is linked.
  if (newStatus === "verified") {
    await query(
      "UPDATE loop_contracts SET status = 'completed', updated_at = NOW() WHERE id = $1",
      [id]
    );
    await publishEvent(EventTypes.CONTRACT_COMPLETED, { contractId: id, sellerLoopId: current.seller_loop_id });
  }

  const { rows: updated } = await query<Record<string, unknown>>(
    "SELECT * FROM loop_contracts WHERE id = $1",
    [id]
  );
  return NextResponse.json(updated[0]);
}
