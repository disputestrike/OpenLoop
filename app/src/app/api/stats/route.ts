import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

const DOCKER_DB =
  "postgresql://postgres:postgres@127.0.0.1:5433/openloop";

function getPool() {
  // In development always use Docker DB so the dashboard shows data.
  const url = process.env.NODE_ENV === "production" ? process.env.DATABASE_URL : DOCKER_DB;
  return url ? new Pool({ connectionString: url, max: 2 }) : null;
}

// GET /api/stats — Public stats for landing. Always live; uses Docker DB in dev.
export async function GET() {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json(
      { activeLoops: 0, totalLoops: 0, verifiedLoops: 0, dealsCompleted: 0, valueSavedCents: 0, valueSavedDeltaPercent: 0, humansCount: 0, billsCount: 0, refundsCount: 0, meetingsCount: 0, commentsCount: 0, votesCount: 0, activitiesCount: 0, activitiesLast24h: 0, commentsLast24h: 0, ts: Date.now(), latestActivityAt: null, latestCommentAt: null },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const humansPromise = pool.query(`SELECT COUNT(*)::text AS n FROM humans`).catch(() => ({ rows: [{ n: "0" }] }));
    const [loopsRes, totalLoopsRes, verifiedRes, txRes, valueRes, last7Res, prev7Res, humansRes, walletSavingsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::text AS n FROM loops WHERE status = 'active'`),
      pool.query(`SELECT COUNT(*)::text AS n FROM loops WHERE loop_tag IS NOT NULL`),
      pool.query(`SELECT COUNT(*)::text AS n FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL AND trust_score >= 70`),
      pool.query(`SELECT COUNT(*)::text AS n FROM transactions WHERE status = 'completed'`),
      pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed'`),
      pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM loop_wallet_events WHERE event_type IN ('savings', 'deal')`).catch(() => ({ rows: [{ sum: "0" }] })),
      humansPromise,
    ]);
    const activeLoops = parseInt(loopsRes.rows[0]?.n || "0", 10);
    const totalLoops = parseInt(totalLoopsRes.rows[0]?.n || "0", 10);
    const verifiedLoops = parseInt(verifiedRes.rows[0]?.n || "0", 10);
    const dealsCompleted = parseInt(txRes.rows[0]?.n || "0", 10);
    const valueSavedCents = parseInt(valueRes.rows[0]?.sum || "0", 10);
    const last7Cents = parseInt(last7Res.rows[0]?.sum || "0", 10);
    const prev7Cents = parseInt(prev7Res.rows[0]?.sum || "0", 10);
    const humansCount = parseInt(humansRes.rows[0]?.n || "0", 10);
    const walletSavedCents = parseInt((walletSavingsRes as { rows: Array<{ sum: string }> }).rows[0]?.sum || "0", 10);
    // Use whichever is larger — transactions or wallet savings
    const totalEconomyCents = Math.max(valueSavedCents, walletSavedCents);
    let valueSavedDeltaPercent: number;
    if (prev7Cents > 0) {
      valueSavedDeltaPercent = Math.round(((last7Cents - prev7Cents) / prev7Cents) * 1000) / 10;
    } else if (last7Cents > 0) {
      valueSavedDeltaPercent = 100;
    } else {
      valueSavedDeltaPercent = 0;
    }
    let billsCount = 0, refundsCount = 0, meetingsCount = 0, commentsCount = 0, votesCount = 0, activitiesCount = 0;
    let activitiesLast24h = 0, commentsLast24h = 0;
    try {
      const [bills, refunds, meetings, comments, votes, activities, act24, com24] = await Promise.all([
        pool.query(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%bill%' OR title ILIKE '%negotiated%'`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%refund%'`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%meeting%' OR title ILIKE '%schedule%' OR title ILIKE '%coordinated%'`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activity_comments`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activity_votes`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activities`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activities WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        pool.query(`SELECT COUNT(*)::text AS n FROM activity_comments WHERE created_at >= NOW() - INTERVAL '24 hours'`),
      ]);
      billsCount = parseInt(bills.rows[0]?.n || "0", 10);
      refundsCount = parseInt(refunds.rows[0]?.n || "0", 10);
      meetingsCount = parseInt(meetings.rows[0]?.n || "0", 10);
      commentsCount = parseInt(comments.rows[0]?.n || "0", 10);
      votesCount = parseInt(votes.rows[0]?.n || "0", 10);
      activitiesCount = parseInt(activities.rows[0]?.n || "0", 10);
      activitiesLast24h = parseInt(act24.rows[0]?.n || "0", 10);
      commentsLast24h = parseInt(com24.rows[0]?.n || "0", 10);
    } catch {
      // activities tables may not exist yet — keep 0
    }

    let latestActivityAt: string | null = null;
    let latestCommentAt: string | null = null;
    try {
      const [latAct, latCom] = await Promise.all([
        pool.query(`SELECT MAX(created_at)::text AS max FROM activities`),
        pool.query(`SELECT MAX(created_at)::text AS max FROM activity_comments`),
      ]);
      latestActivityAt = (latAct.rows[0]?.max as string) ?? null;
      latestCommentAt = (latCom.rows[0]?.max as string) ?? null;
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        activeLoops,
        totalLoops,
        verifiedLoops,
        dealsCompleted,
        valueSavedCents: totalEconomyCents,
        walletSavedCents,
        valueSavedDeltaPercent,
        humansCount,
        billsCount,
        refundsCount,
        meetingsCount,
        commentsCount,
        votesCount,
        activitiesCount,
        activitiesLast24h,
        commentsLast24h,
        ts: Date.now(),
        latestActivityAt,
        latestCommentAt,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("[stats] DB error:", msg);
    }
    return NextResponse.json(
      {
        activeLoops: 0,
        totalLoops: 0,
        verifiedLoops: 0,
        dealsCompleted: 0,
        valueSavedCents: 0,
        valueSavedDeltaPercent: 0,
        humansCount: 0,
        billsCount: 0,
        refundsCount: 0,
        meetingsCount: 0,
        commentsCount: 0,
        votesCount: 0,
        activitiesCount: 0,
        activitiesLast24h: 0,
        commentsLast24h: 0,
        ts: Date.now(),
        latestActivityAt: null,
        latestCommentAt: null,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }
}
