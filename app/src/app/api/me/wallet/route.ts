import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const PLATFORM_FEE_PERCENT = 10;

// ── GET /api/me/wallet ────────────────────────────────────────
export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [balanceRes, eventsRes, statsRes] = await Promise.all([
    query<{ balance: string }>(
      "SELECT COALESCE(SUM(net_cents), 0)::text AS balance FROM loop_wallet_events WHERE loop_id = $1",
      [session.loopId]
    ),
    query<{
      id: string; event_type: string; amount_cents: number;
      platform_fee_cents: number; net_cents: number;
      description: string; verification_tier: string; created_at: string;
    }>(
      `SELECT id, event_type, amount_cents, platform_fee_cents, net_cents,
              description, verification_tier, created_at
       FROM loop_wallet_events WHERE loop_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [session.loopId]
    ),
    query<{ total_saved: string; total_deals: string; wins_count: string }>(
      `SELECT
        COALESCE(SUM(CASE WHEN event_type = 'savings' THEN net_cents ELSE 0 END), 0)::text AS total_saved,
        COALESCE(SUM(CASE WHEN event_type = 'deal' THEN net_cents ELSE 0 END), 0)::text AS total_deals,
        COUNT(*)::text AS wins_count
       FROM loop_wallet_events WHERE loop_id = $1`,
      [session.loopId]
    ),
  ]);

  return NextResponse.json({
    balanceCents: parseInt(balanceRes.rows[0]?.balance || "0"),
    events: eventsRes.rows,
    stats: {
      totalSavedCents: parseInt(statsRes.rows[0]?.total_saved || "0"),
      totalDealsCents: parseInt(statsRes.rows[0]?.total_deals || "0"),
      winsCount: parseInt(statsRes.rows[0]?.wins_count || "0"),
    },
  });
}

// ── POST /api/me/wallet — record a value event ────────────────
// Body: { eventType, amountCents, description, verificationTier?, evidenceUrl? }
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    eventType = "savings",
    amountCents,
    description,
    verificationTier = "self_reported",
    evidenceUrl,
  } = body;

  if (!amountCents || amountCents < 1) {
    return NextResponse.json({ error: "amountCents required (positive integer cents)" }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }

  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
  const netCents = amountCents - platformFeeCents;

  // Trust score delta based on verification tier
  const trustDelta = verificationTier === "system" ? 3 : verificationTier === "evidence" ? 2 : 1;

  const [eventRes, loopRes] = await Promise.all([
    query<{ id: string }>(
      `INSERT INTO loop_wallet_events
         (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier, evidence_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [session.loopId, eventType, amountCents, platformFeeCents, netCents, description.trim(), verificationTier, evidenceUrl || null]
    ),
    query<{ trust_score: number }>("SELECT trust_score FROM loops WHERE id = $1", [session.loopId]),
  ]);

  const walletEventId = eventRes.rows[0]?.id;

  // Also log in loop_wins
  await query(
    `INSERT INTO loop_wins (loop_id, description, amount_saved_cents, verification_tier, evidence_url, wallet_event_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.loopId, description.trim(), amountCents, verificationTier, evidenceUrl || null, walletEventId]
  ).catch(() => {});

  // Update trust score
  const prevScore = loopRes.rows[0]?.trust_score ?? 0;
  const newScore = Math.min(100, prevScore + trustDelta);
  await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [newScore, session.loopId]);
  await query(
    "INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason, reference_id) VALUES ($1, $2, $3, 'win_recorded', $4)",
    [session.loopId, prevScore, newScore, walletEventId]
  ).catch(() => {});

  // Post to activity feed
  const dollarAmount = `$${(amountCents / 100).toFixed(2)}`;
  await query(
    `INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'deal')`,
    [session.loopId, `${description.trim()} — ${dollarAmount} saved ✓`]
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    walletEventId,
    amountCents,
    platformFeeCents,
    netCents,
    newTrustScore: newScore,
    message: `Win recorded! ${dollarAmount} added to your Loop Wallet (after ${PLATFORM_FEE_PERCENT}% platform fee).`,
  });
}
