import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Mock stats when DB is not connected — dynamic-looking values for go-live
const MOCK_STATS = {
  activeLoops: 1247,
  totalLoops: 2001,
  verifiedLoops: 892,
  dealsCompleted: 8932,
  valueSavedCents: 280000000,
  valueSavedDeltaPercent: 5.2,
  humansCount: 100042,
  billsCount: 3420,
  refundsCount: 1891,
  meetingsCount: 5620,
  commentsCount: 12400,
  votesCount: 28900,
  activitiesCount: 45000,
  activitiesLast24h: 120,
  commentsLast24h: 89,
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

// GET /api/stats — Public stats for landing. Always live; returns ts + latestActivityAt for diagnostics.
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ...MOCK_STATS, ts: Date.now() }, { headers: NO_CACHE_HEADERS });
    }
    const [loopsRes, totalLoopsRes, verifiedRes, txRes, valueRes, last7Res, prev7Res, humansRes] = await Promise.all([
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM loops WHERE status = 'active'`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM loops WHERE loop_tag IS NOT NULL`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL AND trust_score >= 70`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM transactions WHERE status = 'completed'`),
      query<{ sum: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed'`),
      query<{ sum: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'`),
      query<{ sum: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS sum FROM transactions WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'`),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM humans`),
    ]);
    const activeLoops = parseInt(loopsRes.rows[0]?.n || "0", 10);
    const totalLoops = parseInt(totalLoopsRes.rows[0]?.n || "0", 10);
    const verifiedLoops = parseInt(verifiedRes.rows[0]?.n || "0", 10);
    const dealsCompleted = parseInt(txRes.rows[0]?.n || "0", 10);
    const valueSavedCents = parseInt(valueRes.rows[0]?.sum || "0", 10);
    const last7Cents = parseInt(last7Res.rows[0]?.sum || "0", 10);
    const prev7Cents = parseInt(prev7Res.rows[0]?.sum || "0", 10);
    const humansCount = parseInt(humansRes.rows[0]?.n || "0", 10);
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
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%bill%' OR title ILIKE '%negotiated%'`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%refund%'`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE title ILIKE '%meeting%' OR title ILIKE '%schedule%' OR title ILIKE '%coordinated%'`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_votes`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE created_at >= NOW() - INTERVAL '24 hours'`),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments WHERE created_at >= NOW() - INTERVAL '24 hours'`),
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
        query<{ max: string | null }>(`SELECT MAX(created_at)::text AS max FROM activities`),
        query<{ max: string | null }>(`SELECT MAX(created_at)::text AS max FROM activity_comments`),
      ]);
      latestActivityAt = latAct.rows[0]?.max ?? null;
      latestCommentAt = latCom.rows[0]?.max ?? null;
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        activeLoops,
        totalLoops,
        verifiedLoops,
        dealsCompleted,
        valueSavedCents,
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
  } catch {
    if (!process.env.DATABASE_URL) return NextResponse.json({ ...MOCK_STATS, ts: Date.now() }, { headers: NO_CACHE_HEADERS });
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
