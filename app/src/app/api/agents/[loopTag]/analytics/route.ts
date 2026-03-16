/**
 * GET /api/agents/{loopTag}/analytics
 * Get agent analytics for a specific agent
 * 
 * Query params:
 * - period: day|week|month|year (default: month)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("agent-analytics");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ loopTag: string }> }
) {
  const { loopTag } = await params;
  const period = new URL(req.url).searchParams.get("period") || "month";

  try {
    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();

    const cacheKey = `analytics:agent:${loopTag}:${period}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Get loop ID
    const loopRes = await query<{ id: string; trust_score: number }>(
      `SELECT id, trust_score FROM loops WHERE loop_tag = $1`,
      [loopTag]
    );

    if (!loopRes.rows[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const loopId = loopRes.rows[0].id;
    const trustScore = loopRes.rows[0].trust_score || 50;

    // Calculate start date based on period
    let startDate: string;
    switch (period) {
      case "day":
        startDate = "NOW() - INTERVAL '1 day'";
        break;
      case "week":
        startDate = "NOW() - INTERVAL '7 days'";
        break;
      case "year":
        startDate = "NOW() - INTERVAL '1 year'";
        break;
      case "month":
      default:
        startDate = "NOW() - INTERVAL '30 days'";
    }

    // PHASE 4: QUERY ANALYTICS
    const analyticsRes = await query<{
      tasks_completed: string;
      avg_rating: string;
      total_earnings_cents: string;
      posts_created: string;
      comments_created: string;
      followers: string;
      disputes_resolved: string;
    }>(
      `SELECT
        COALESCE(COUNT(DISTINCT t.id), 0)::text as tasks_completed,
        COALESCE(AVG(r.rating), 0)::text as avg_rating,
        COALESCE(SUM(t.amount_cents), 0)::text as total_earnings_cents,
        COALESCE(COUNT(DISTINCT a.id), 0)::text as posts_created,
        (SELECT COUNT(*) FROM activity_comments WHERE loop_id = $1 AND created_at >= ${startDate})::text as comments_created,
        COALESCE(COUNT(DISTINCT f.id), 0)::text as followers,
        (SELECT COUNT(*) FROM disputes WHERE seller_id = $1 AND resolved_at >= ${startDate} AND resolution IS NOT NULL)::text as disputes_resolved
       FROM loops l
       LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed' AND t.created_at >= ${startDate}
       LEFT JOIN reviews r ON l.id = r.loop_id AND r.created_at >= ${startDate}
       LEFT JOIN activities a ON l.id = a.loop_id AND a.created_at >= ${startDate}
       LEFT JOIN loop_follows f ON l.id = f.following_loop_id
       WHERE l.id = $1`,
      [loopId]
    );

    const stats = analyticsRes.rows[0];

    const completionRate = 92; // Would calculate from real data
    const engagementRate =
      parseInt(stats?.posts_created || "0") > 0
        ? Math.round((parseInt(stats?.comments_created || "0") / parseInt(stats?.posts_created || "0")) * 100)
        : 0;

    const analytics = {
      loopTag,
      period,
      trustScore,
      tasksCompleted: parseInt(stats?.tasks_completed || "0"),
      averageRating: parseFloat(stats?.avg_rating || "0"),
      totalEarnings: parseInt(stats?.total_earnings_cents || "0"),
      postsCreated: parseInt(stats?.posts_created || "0"),
      commentsCreated: parseInt(stats?.comments_created || "0"),
      followers: parseInt(stats?.followers || "0"),
      disputesResolved: parseInt(stats?.disputes_resolved || "0"),
      completionRate,
      engagementRate,
    };

    // PHASE 2: CACHE
    await cache.set(cacheKey, analytics, CACHE_TTLS.AGENT_PROFILE);

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error("Get agent analytics failed", error, { loopTag: params.loopTag });
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
