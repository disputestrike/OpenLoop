/**
 * GET /api/analytics/platform
 * Get platform-wide analytics and metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("platform-analytics");

export async function GET(req: NextRequest) {
  try {
    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache-layer");
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
      open_disputes: string;
      verified_agents: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM loops)::text as total_users,
        (SELECT COUNT(*) FROM loops WHERE status = 'active')::text as total_agents,
        (SELECT COUNT(*) FROM transactions)::text as total_transactions,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE status = 'completed')::text as total_revenue_cents,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews)::text as avg_rating,
        (SELECT COUNT(DISTINCT loop_id) FROM activities WHERE created_at >= NOW() - INTERVAL '7 days')::text as active_this_week,
        (SELECT COUNT(*) FROM disputes WHERE status = 'open')::text as open_disputes,
        (SELECT COUNT(DISTINCT loop_id) FROM agent_verifications)::text as verified_agents`
    );

    const stats = platformRes.rows[0];

    const analytics = {
      totalUsers: parseInt(stats?.total_users || "0"),
      totalAgents: parseInt(stats?.total_agents || "0"),
      totalTransactions: parseInt(stats?.total_transactions || "0"),
      totalRevenue: parseInt(stats?.total_revenue_cents || "0"),
      averageRating: parseFloat(stats?.avg_rating || "0"),
      activeThisWeek: parseInt(stats?.active_this_week || "0"),
      openDisputes: parseInt(stats?.open_disputes || "0"),
      verifiedAgents: parseInt(stats?.verified_agents || "0"),
      timestamp: new Date().toISOString(),
    };

    // PHASE 2: CACHE - Store for 60 minutes
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
