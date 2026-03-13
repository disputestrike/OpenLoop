/**
 * G8/B5 Admin contract dispute resolution — buyer_wins (refund) or seller_wins (release payout).
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { refundBuyer } from "@/lib/payments";

function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = req.headers.get("x-admin-secret") ?? req.nextUrl.searchParams.get("admin_secret");
  return !!secret && header === secret;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: { decision: "buyer_wins" | "seller_wins"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const decision = body?.decision;
  if (decision !== "buyer_wins" && decision !== "seller_wins") {
    return NextResponse.json({ error: "decision must be buyer_wins or seller_wins" }, { status: 400 });
  }

  const { rows } = await query<{
    status: string;
    stripe_payment_id: string | null;
    seller_loop_id: string;
  }>(
    "SELECT status, stripe_payment_id, seller_loop_id FROM loop_contracts WHERE id = $1",
    [id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }
  const contract = rows[0];
  if (contract.status !== "disputed") {
    return NextResponse.json({ error: "Contract is not in disputed status" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;

  try {
    if (decision === "buyer_wins" && contract.stripe_payment_id) {
      await refundBuyer(contract.stripe_payment_id);
      await query(
        `UPDATE loop_contracts SET status = 'completed_refunded', resolution_note = $1, updated_at = NOW() WHERE id = $2`,
        [reason, id]
      );
    } else if (decision === "seller_wins") {
      // Requires seller to have stripe_connect_account_id on loops — placeholder for now
      await query(
        `UPDATE loop_contracts SET status = 'completed', resolution_note = $1, updated_at = NOW() WHERE id = $2`,
        [reason, id]
      );
      // When Stripe Connect is set: await releasePayout(id, sellerStripeAccountId);
    }
    return NextResponse.json({ success: true, decision });
  } catch (e) {
    console.error("[admin resolve]", e);
    return NextResponse.json({ error: "Resolution failed" }, { status: 500 });
  }
}
