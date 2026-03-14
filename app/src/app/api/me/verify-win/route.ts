import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * POST /api/me/verify-win
 * Called when user confirms their Loop achieved something real.
 * Records the win, posts to wallet, updates trust score, posts to feed.
 *
 * Body: {
 *   description: string,
 *   amountSavedCents: number,
 *   verificationTier: 'self_reported' | 'evidence' | 'system',
 *   evidenceUrl?: string,
 *   evidenceType?: 'screenshot' | 'email' | 'receipt' | 'api',
 *   rating?: 1-5
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    description,
    amountSavedCents = 0,
    verificationTier = "self_reported",
    evidenceUrl,
    evidenceType,
    rating,
  } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }

  const PLATFORM_FEE_PERCENT = 10;
  const platformFee = Math.round(amountSavedCents * PLATFORM_FEE_PERCENT / 100);
  const netCents = amountSavedCents - platformFee;

  // Trust delta by verification tier
  const trustDelta = verificationTier === "system" ? 3 : verificationTier === "evidence" ? 2 : 1;

  // 1. Record wallet event
  let walletEventId: string | null = null;
  if (amountSavedCents > 0) {
    const walletRes = await query<{ id: string }>(
      `INSERT INTO loop_wallet_events
         (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier, evidence_url)
       VALUES ($1, 'savings', $2, $3, $4, $5, $6, $7) RETURNING id`,
      [session.loopId, amountSavedCents, platformFee, netCents, description.trim(), verificationTier, evidenceUrl || null]
    );
    walletEventId = walletRes.rows[0]?.id || null;
  }

  // 2. Record win
  await query(
    `INSERT INTO loop_wins
       (loop_id, description, amount_saved_cents, verification_tier, evidence_url, evidence_type, user_rating, wallet_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [session.loopId, description.trim(), amountSavedCents, verificationTier, evidenceUrl || null, evidenceType || null, rating || null, walletEventId]
  );

  // 3. Update trust score
  const loopRes = await query<{ trust_score: number; loop_tag: string }>(
    "SELECT trust_score, loop_tag FROM loops WHERE id = $1", [session.loopId]
  );
  const prev = loopRes.rows[0]?.trust_score ?? 0;
  const loopTag = loopRes.rows[0]?.loop_tag ?? "Loop";
  const newScore = Math.min(100, prev + trustDelta);
  await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [newScore, session.loopId]);
  await query(
    "INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason) VALUES ($1, $2, $3, 'win_verified')",
    [session.loopId, prev, newScore]
  ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

  // 4. Post to activity feed with verification badge
  const verificationBadge = verificationTier === "system" ? "✓✓" : verificationTier === "evidence" ? "✓" : "";
  const dollarStr = amountSavedCents > 0 ? ` — $${(amountSavedCents / 100).toFixed(2)} saved ${verificationBadge}` : ` ${verificationBadge}`;
  await query(
    "INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'deal')",
    [session.loopId, `${description.trim()}${dollarStr} #${loopTag}`]
  ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

  return NextResponse.json({
    ok: true,
    walletEventId,
    amountSavedCents,
    platformFeeCents: platformFee,
    netCents,
    newTrustScore: newScore,
    trustDelta,
    message: amountSavedCents > 0
      ? `Win verified! $${(netCents / 100).toFixed(2)} added to your Loop Wallet.`
      : "Win recorded and trust score updated.",
  });
}
