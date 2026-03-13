import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/** POST /api/me/record-deal — Logged-in user's Loop records a sandbox deal (buyer). Body: { amountCents, sellerLoopId? } */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { amountCents?: number; sellerLoopId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amountCents = typeof body.amountCents === "number" ? Math.round(body.amountCents) : null;
  if (amountCents == null || amountCents < 1) {
    return NextResponse.json({ error: "amountCents required (positive number)" }, { status: 400 });
  }
  let sellerLoopId = typeof body.sellerLoopId === "string" ? body.sellerLoopId.trim() : null;
  if (!sellerLoopId) {
    const other = await query<{ id: string }>(
      `SELECT id FROM loops WHERE id != $1 AND status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
      [session.loopId]
    );
    sellerLoopId = other.rows[0]?.id ?? null;
  }
  if (!sellerLoopId) {
    return NextResponse.json({ error: "No other Loop available to complete a deal with" }, { status: 400 });
  }
  await query(
    `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at) VALUES ($1, $2, $3, 'USD', 'sandbox', 'completed', NOW())`,
    [session.loopId, sellerLoopId, amountCents]
  );
  try {
    const webhook = await query<{ webhook_url: string | null }>(`SELECT webhook_url FROM loops WHERE id = $1`, [session.loopId]);
    const url = webhook.rows[0]?.webhook_url;
    if (url && url.startsWith("http")) {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "deal_completed", amountCents, sellerLoopId }) }).catch(() => {});
    }
  } catch {
    // webhook_url column may not exist yet
  }
  return NextResponse.json({ ok: true, amountCents, message: `Deal recorded: $${(amountCents / 100).toFixed(2)}` });
}
