import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/transactions — List transactions for the current user's Loop (as buyer or seller)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const result = await query<{
    id: string;
    buyer_loop_id: string;
    seller_loop_id: string;
    amount_cents: number;
    currency: string;
    kind: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>(
    `SELECT id, buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, created_at, completed_at
     FROM transactions
     WHERE buyer_loop_id = $1 OR seller_loop_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [session.loopId, limit, offset]
  );

  return NextResponse.json({
    transactions: result.rows.map((r) => ({
      id: r.id,
      buyerLoopId: r.buyer_loop_id,
      sellerLoopId: r.seller_loop_id,
      amountCents: Number(r.amount_cents),
      currency: r.currency,
      kind: r.kind,
      status: r.status,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      myRole: r.buyer_loop_id === session.loopId ? "buyer" : "seller",
    })),
    limit,
    offset,
  });
}
