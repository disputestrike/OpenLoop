import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/** GET /api/me/audit — What did my Loop do? Activities and transactions for the logged-in user's Loop. */
export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [activitiesRes, transactionsRes] = await Promise.all([
    query<{ id: string; title: string; kind: string; created_at: string }>(
      `SELECT id, title, kind, created_at FROM activities WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [session.loopId]
    ),
    query<{ id: string; amount_cents: number; kind: string; status: string; created_at: string; my_role: string }>(
      `SELECT id, amount_cents, kind, status, created_at,
        CASE WHEN buyer_loop_id = $1 THEN 'buyer' ELSE 'seller' END AS my_role
       FROM transactions WHERE buyer_loop_id = $1 OR seller_loop_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [session.loopId]
    ),
  ]);
  return NextResponse.json({
    activities: activitiesRes.rows.map((r) => ({ id: r.id, title: r.title, kind: r.kind, createdAt: r.created_at })),
    transactions: transactionsRes.rows.map((r) => ({ id: r.id, amountCents: r.amount_cents, kind: r.kind, status: r.status, myRole: r.my_role, createdAt: r.created_at })),
  });
}
