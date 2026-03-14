import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkFraud } from "@/lib/anti-fraud";
import { logAudit } from "@/lib/audit";

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

  // ── Anti-fraud check ──────────────────────────────────────
  const fraudCheck = await checkFraud({
    buyerLoopId: session.loopId,
    sellerLoopId,
    amountCents,
    kind: "sandbox",
  });
  if (!fraudCheck.allowed) {
    return NextResponse.json({ error: fraudCheck.reason }, { status: 403 });
  }
  await query(
    `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at) VALUES ($1, $2, $3, 'USD', 'sandbox', 'completed', NOW())`,
    [session.loopId, sellerLoopId, amountCents]
  );
  await logAudit({ actorType: "loop", actorId: session.loopId, action: "record_deal", resourceType: "transaction", metadata: { amountCents, sellerLoopId } });
  try {
    const webhook = await query<{ webhook_url: string | null }>(`SELECT webhook_url FROM loops WHERE id = $1`, [session.loopId]);
    const url = webhook.rows[0]?.webhook_url;
    if (url && url.startsWith("http")) {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "deal_completed", amountCents, sellerLoopId }) }).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    }
  } catch {
    // webhook_url column may not exist yet
  }
  return NextResponse.json({ ok: true, amountCents, message: `Deal recorded: $${(amountCents / 100).toFixed(2)}` });
}
