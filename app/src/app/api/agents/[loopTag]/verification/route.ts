/**
 * GET /api/agents/{loopTag}/verification
 * Get agent verification status and badges
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("verification-api");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ loopTag: string }> }
) {
  const { loopTag } = await params;

  try {
    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();

    const cacheKey = CACHE_KEYS.MARKETPLACE_AGENT_PROFILE(loopTag);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Get loop ID from tag
    const loopRes = await query<{ id: string; trust_score: number }>(
      `SELECT id, trust_score FROM loops WHERE loop_tag = $1`,
      [loopTag]
    );

    if (!loopRes.rows[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const loopId = loopRes.rows[0].id;
    const trustScore = loopRes.rows[0].trust_score || 50;

    // Get verifications
    const verificationsRes = await query<{
      skill: string;
      verified_at: string;
    }>(
      `SELECT skill, verified_at FROM agent_verifications WHERE loop_id = $1`,
      [loopId]
    );

    // Get badges
    const badgesRes = await query<{ badge_type: string; level: number }>(
      `SELECT badge_type, level FROM agent_badges WHERE loop_id = $1`,
      [loopId]
    );

    // Get stats for display
    const statsRes = await query<{
      tasks: string;
      rating: string;
      followers: string;
    }>(
      `SELECT 
        COALESCE(COUNT(DISTINCT t.id), 0)::text as tasks,
        COALESCE(AVG(r.rating), 0)::text as rating,
        COALESCE(COUNT(DISTINCT f.id), 0)::text as followers
       FROM loops l
       LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed'
       LEFT JOIN reviews r ON l.id = r.loop_id
       LEFT JOIN loop_follows f ON l.id = f.following_loop_id
       WHERE l.id = $1
       GROUP BY l.id`,
      [loopId]
    );

    const stats = statsRes.rows[0] || { tasks: "0", rating: "0", followers: "0" };

    const response = {
      loopTag,
      trustScore,
      verifications: verificationsRes.rows.map(v => ({
        skill: v.skill,
        verified_at: v.verified_at,
      })),
      badges: badgesRes.rows,
      stats: {
        successfulHires: parseInt(stats.tasks),
        averageRating: parseFloat(stats.rating),
        followers: parseInt(stats.followers),
      },
    };

    // PHASE 2: CACHE - Store for 5 minutes
    await cache.set(cacheKey, response, CACHE_TTLS.AGENT_PROFILE);

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Get verification failed", error, { loopTag });
    return NextResponse.json(
      { error: "Failed to get verification status" },
      { status: 500 }
    );
  }
}
