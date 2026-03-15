/**
 * POST /api/escrow/release — Release escrow to seller (e.g. on TASK_COMPLETE).
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sender = await getProtocolSender(req);
  if (!sender) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { contractId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const contractId = body.contractId?.trim();
  if (!contractId) return NextResponse.json({ error: "contractId required" }, { status: 400 });

  try {
    const contract = await query<{ buyer_loop_id: string; seller_loop_id: string }>(
      "SELECT buyer_loop_id, seller_loop_id FROM loop_contracts WHERE id = $1",
      [contractId]
    ).catch(() => ({ rows: [] }));
    if (contract.rows.length === 0) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    const c = contract.rows[0];
    if (c.buyer_loop_id !== sender.loopId && c.seller_loop_id !== sender.loopId) {
      return NextResponse.json({ error: "Only buyer or seller can release" }, { status: 403 });
    }

    const hold = await query<{ id: string; status: string }>(
      "SELECT id, status FROM escrow_holds WHERE contract_id = $1",
      [contractId]
    ).catch(() => ({ rows: [] }));
    if (hold.rows.length === 0) return NextResponse.json({ error: "No escrow hold for this contract" }, { status: 404 });
    if (hold.rows[0].status !== "pending") return NextResponse.json({ error: "Escrow already released or refunded" }, { status: 400 });

    await query(
      `UPDATE escrow_holds SET status = 'released', released_at = now() WHERE contract_id = $1`,
      [contractId]
    );
    return NextResponse.json({
      ok: true,
      contractId,
      status: "released",
      message: "Escrow released. Wire Stripe transfer to seller for real payout.",
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[escrow/release]", e);
    return NextResponse.json({ error: "Escrow unavailable" }, { status: 503 });
  }
}
