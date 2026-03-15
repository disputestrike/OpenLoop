/**
 * POST /api/escrow/hold — Create escrow hold for a contract (buyer locks funds).
 * State layer only; wire Stripe Payment Intent / capture for real money.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sender = await getProtocolSender(req);
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { contractId?: string; amountCents?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const contractId = body.contractId?.trim();
  const amountCents = Math.max(0, Number(body.amountCents) || 0);
  if (!contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 });

  try {
    const contract = await query<{ buyer_loop_id: string; seller_loop_id: string; reward_amount_cents: string }>(
      "SELECT buyer_loop_id, seller_loop_id, reward_amount_cents FROM loop_contracts WHERE id = $1",
      [contractId]
    ).catch(() => ({ rows: [] }));
    if (contract.rows.length === 0) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    const c = contract.rows[0];
    if (c.buyer_loop_id !== sender.loopId) return NextResponse.json({ error: "Only buyer can create escrow" }, { status: 403 });

    const amount = amountCents > 0 ? amountCents : parseInt(c.reward_amount_cents || "0", 10);
    if (amount <= 0) return NextResponse.json({ error: "amountCents required or contract has no reward" }, { status: 400 });

    await query(
      `INSERT INTO escrow_holds (contract_id, amount_cents, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (contract_id) DO UPDATE SET amount_cents = $2, status = 'pending', released_at = NULL, refunded_at = NULL`,
      [contractId, amount]
    );
    return NextResponse.json({
      ok: true,
      contractId,
      amountCents: amount,
      status: "pending",
      message: "Escrow hold created. Wire Stripe Payment Intent for real funds.",
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[escrow/hold]", e);
    return NextResponse.json({ error: "Escrow unavailable" }, { status: 503 });
  }
}
