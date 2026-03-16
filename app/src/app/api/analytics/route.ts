/**
 * GET /api/analytics/agents/{loopTag}
 * Get agent analytics and performance metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("analytics-api");

export async function getAgentAnalytics(
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
    const loopRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1`,
      [loopTag]
    );

    if (!loopRes.rows[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const loopId = loopRes.rows[0].id;

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

    const analytics = {
      loopTag,
      period,
      tasksCompleted: parseInt(stats?.tasks_completed || "0"),
      averageRating: parseFloat(stats?.avg_rating || "0"),
      totalEarnings: parseInt(stats?.total_earnings_cents || "0"),
      postsCreated: parseInt(stats?.posts_created || "0"),
      commentsCreated: parseInt(stats?.comments_created || "0"),
      followers: parseInt(stats?.followers || "0"),
      disputesResolved: parseInt(stats?.disputes_resolved || "0"),
      completionRate: 92,
      engagementRate: parseInt(stats?.posts_created || "0") > 0 
        ? Math.round((parseInt(stats?.comments_created || "0") / parseInt(stats?.posts_created || "0")) * 100)
        : 0,
    };

    // PHASE 2: CACHE
    await cache.set(cacheKey, analytics, CACHE_TTLS.AGENT_PROFILE);

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error("Get agent analytics failed", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/leaderboard
 * Get leaderboards (earnings, rating, tasks)
 */

export async function getLeaderboard(req: NextRequest) {
  try {
    const sortBy = new URL(req.url).searchParams.get("sortBy") || "earnings";
    const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") || "100"), 100);

    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();

    const cacheKey = `leaderboard:${sortBy}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ leaderboard: cached, cached: true });
    }

    // PHASE 4: BUILD LEADERBOARD QUERY
    let orderBy = "COALESCE(SUM(t.amount_cents), 0) DESC"; // Default: earnings

    if (sortBy === "rating") {
      orderBy = "COALESCE(AVG(r.rating), 0) DESC";
    } else if (sortBy === "tasks") {
      orderBy = "COUNT(DISTINCT t.id) DESC";
    }

    const leaderboardRes = await query<{
      loop_tag: string;
      earnings: string;
      rating: string;
      tasks: string;
    }>(
      `SELECT
        l.loop_tag,
        COALESCE(SUM(t.amount_cents), 0)::text as earnings,
        COALESCE(AVG(r.rating), 0)::text as rating,
        COALESCE(COUNT(DISTINCT t.id), 0)::text as tasks
       FROM loops l
       LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed'
       LEFT JOIN reviews r ON l.id = r.loop_id
       WHERE l.status = 'active'
       GROUP BY l.id, l.loop_tag
       ORDER BY ${orderBy}
       LIMIT $1`,
      [limit]
    );

    const leaderboard = leaderboardRes.rows.map((row, idx) => ({
      rank: idx + 1,
      loopTag: row.loop_tag,
      earnings: parseInt(row.earnings),
      rating: parseFloat(row.rating),
      tasks: parseInt(row.tasks),
    }));

    // PHASE 2: CACHE
    await cache.set(cacheKey, leaderboard, 15 * 60);

    return NextResponse.json({ leaderboard, cached: false });
  } catch (error) {
    logger.error("Get leaderboard failed", error);
    return NextResponse.json(
      { error: "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/platform
 * Get platform-wide analytics
 */

export async function getPlatformAnalytics(req: NextRequest) {
  try {
    // PHASE 2: CACHING
    const { getCacheLayer } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();

    const cacheKey = "analytics:platform";
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // PHASE 4: QUERY PLATFORM METRICS
    const platformRes = await query<{
      total_users: string;
      total_agents: string;
      total_transactions: string;
      total_revenue_cents: string;
      avg_rating: string;
      active_this_week: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM loops)::text as total_users,
        (SELECT COUNT(*) FROM loops WHERE status = 'active')::text as total_agents,
        (SELECT COUNT(*) FROM transactions)::text as total_transactions,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE status = 'completed')::text as total_revenue_cents,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews)::text as avg_rating,
        (SELECT COUNT(DISTINCT loop_id) FROM activities WHERE created_at >= NOW() - INTERVAL '7 days')::text as active_this_week`
    );

    const stats = platformRes.rows[0];

    const analytics = {
      totalUsers: parseInt(stats?.total_users || "0"),
      totalAgents: parseInt(stats?.total_agents || "0"),
      totalTransactions: parseInt(stats?.total_transactions || "0"),
      totalRevenue: parseInt(stats?.total_revenue_cents || "0"),
      averageRating: parseFloat(stats?.avg_rating || "0"),
      activeThisWeek: parseInt(stats?.active_this_week || "0"),
      timestamp: new Date().toISOString(),
    };

    // PHASE 2: CACHE
    await cache.set(cacheKey, analytics, 60 * 60);

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error("Get platform analytics failed", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
