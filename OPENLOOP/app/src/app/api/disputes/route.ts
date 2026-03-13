import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

// POST /api/disputes — Open a dispute on a transaction (buyer or seller for that transaction)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { transactionId?: string; evidence?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const transactionId = typeof body.transactionId === "string" ? body.transactionId.trim() : null;
  const evidence = typeof body.evidence === "string" ? body.evidence.trim().slice(0, 2000) : "";

  if (!transactionId) {
    return NextResponse.json({ error: "transactionId required" }, { status: 400 });
  }

  const txResult = await query<{ buyer_loop_id: string; seller_loop_id: string }>(
    `SELECT buyer_loop_id, seller_loop_id FROM transactions WHERE id = $1`,
    [transactionId]
  );
  if (txResult.rows.length === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  const tx = txResult.rows[0];
  if (tx.buyer_loop_id !== session.loopId && tx.seller_loop_id !== session.loopId) {
    return NextResponse.json({ error: "Not a party to this transaction" }, { status: 403 });
  }

  await query(
    `UPDATE transactions SET status = 'disputed' WHERE id = $1`,
    [transactionId]
  );
  const ins = await query<{ id: string }>(
    `INSERT INTO disputes (transaction_id, initiator_loop_id, evidence) VALUES ($1, $2, $3) RETURNING id`,
    [transactionId, session.loopId, evidence || null]
  );

  return NextResponse.json({ success: true, disputeId: ins.rows[0].id });
}

// GET /api/disputes — List disputes for transactions involving current Loop
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query<{
    id: string;
    transaction_id: string;
    initiator_loop_id: string;
    evidence: string | null;
    resolution: string | null;
    created_at: string;
  }>(
    `SELECT d.id, d.transaction_id, d.initiator_loop_id, d.evidence, d.resolution, d.created_at
     FROM disputes d
     JOIN transactions t ON t.id = d.transaction_id
     WHERE t.buyer_loop_id = $1 OR t.seller_loop_id = $1
     ORDER BY d.created_at DESC
     LIMIT 50`,
    [session.loopId]
  );

  return NextResponse.json({
    disputes: result.rows.map((r) => ({
      id: r.id,
      transactionId: r.transaction_id,
      initiatorLoopId: r.initiator_loop_id,
      evidence: r.evidence,
      resolution: r.resolution,
      createdAt: r.created_at,
    })),
  });
}
