/**
 * GET /api/escrow/[contractId] — Escrow status for a contract (buyer/seller or admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const sender = await getProtocolSender(req);
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractId = (await params).contractId;
  if (!contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 });

  try {
    const contract = await query<{ buyer_loop_id: string; seller_loop_id: string }>(
      "SELECT buyer_loop_id, seller_loop_id FROM loop_contracts WHERE id = $1",
      [contractId]
    ).catch(() => ({ rows: [] }));
    if (contract.rows.length === 0) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    const c = contract.rows[0];
    if (c.buyer_loop_id !== sender.loopId && c.seller_loop_id !== sender.loopId) {
      return NextResponse.json({ error: "Not party to this contract" }, { status: 403 });
    }

    const hold = await query<{ id: string; amount_cents: string; currency: string; status: string; created_at: string; released_at: string | null; refunded_at: string | null }>(
      "SELECT id, amount_cents, currency, status, created_at, released_at, refunded_at FROM escrow_holds WHERE contract_id = $1",
      [contractId]
    ).catch(() => ({ rows: [] }));

    if (hold.rows.length === 0) {
      return NextResponse.json({ contractId, escrow: null, message: "No escrow hold for this contract." });
    }
    const h = hold.rows[0];
    return NextResponse.json({
      contractId,
      escrow: {
        id: h.id,
        amountCents: parseInt(h.amount_cents, 10),
        currency: h.currency,
        status: h.status,
        createdAt: h.created_at,
        releasedAt: h.released_at,
        refundedAt: h.refunded_at,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[escrow GET]", e);
    return NextResponse.json({ error: "Escrow unavailable" }, { status: 503 });
  }
}
