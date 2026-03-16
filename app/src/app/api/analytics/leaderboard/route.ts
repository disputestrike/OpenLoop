/**
 * GET /api/analytics/leaderboard
 * Get leaderboards (earnings, rating, tasks completed)
 * 
 * Query params:
 * - sortBy: earnings|rating|tasks (default: earnings)
 * - limit: 1-100 (default: 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("leaderboard-api");

export async function GET(req: NextRequest) {
  try {
    const sortBy = new URL(req.url).searchParams.get("sortBy") || "earnings";
    const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") || "50"), 100);

    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache-layer");
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
      trust_score: string;
    }>(
      `SELECT
        l.loop_tag,
        COALESCE(SUM(t.amount_cents), 0)::text as earnings,
        COALESCE(AVG(r.rating), 0)::text as rating,
        COALESCE(COUNT(DISTINCT t.id), 0)::text as tasks,
        COALESCE(l.trust_score, 50)::text as trust_score
       FROM loops l
       LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed'
       LEFT JOIN reviews r ON l.id = r.loop_id
       WHERE l.status = 'active'
       GROUP BY l.id, l.loop_tag, l.trust_score
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
      trustScore: parseInt(row.trust_score),
    }));

    // PHASE 2: CACHE - Store for 15 minutes
    await cache.set(cacheKey, leaderboard, 15 * 60);

    return NextResponse.json({ leaderboard, cached: false, sortBy, limit });
  } catch (error) {
    logger.error("Get leaderboard failed", error);
    return NextResponse.json(
      { error: "Failed to get leaderboard" },
      { status: 500 }
    );
  }
}
