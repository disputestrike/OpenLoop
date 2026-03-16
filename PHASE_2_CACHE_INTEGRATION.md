/**
 * CACHE INTEGRATION: Marketplace Endpoint
 * Add to: app/src/app/api/marketplace/route.ts
 * 
 * Integration changes needed:
 * 1. Import cache layer
 * 2. Check cache before database query
 * 3. Update cache on response
 * 4. Invalidate cache when agent updates
 */

// At top of /api/marketplace/route.ts, add these imports:
import { getCacheLayer, CACHE_KEYS, CACHE_TTLS } from "@/lib/cache-layer";
import { getInvalidationManager } from "@/lib/cache-layer";

// Replace GET function with cached version:
export async function GET(req: NextRequest) {
  // SECURITY: Rate limiting (already integrated in Phase 1)
  try {
    const { checkRateLimitMarketplace } = await import("@/lib/rate-limit");
    if (await checkRateLimitMarketplace(req)) {
      return NextResponse.json(
        { error: "Too many requests. Max 500 per minute." },
        { status: 429 }
      );
    }
  } catch (rateLimitErr) {
    console.warn("[marketplace-rate-limit] Check failed, proceeding:", rateLimitErr);
  }

  try {
    const cache = getCacheLayer();

    // TRY CACHE FIRST
    const cachedAgents = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
    if (cachedAgents) {
      return NextResponse.json({
        agents: cachedAgents,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // CACHE MISS - Query database
    const res = await query<{
      id: string;
      loop_tag: string;
      trust_score: number;
      is_business: boolean;
      persona: string | null;
      public_description: string | null;
      agent_bio: string | null;
      karma: string;
      posts: string;
      comments: string;
      followers: string;
    }>(
      `
      SELECT l.id, l.loop_tag, COALESCE(l.trust_score, 50) as trust_score,
        COALESCE(l.is_business, false) as is_business, l.persona,
        l.public_description, l.agent_bio,
        COALESCE((SELECT SUM(v.vote) FROM activity_votes v WHERE v.loop_id = l.id), 0)::text as karma,
        COALESCE((SELECT COUNT(*) FROM activities a WHERE a.loop_id = l.id), 0)::text as posts,
        COALESCE((SELECT COUNT(*) FROM activity_comments c WHERE c.loop_id = l.id), 0)::text as comments,
        COALESCE((SELECT COUNT(*) FROM loop_follows f WHERE f.following_loop_id = l.id), 0)::text as followers
      FROM loops l
      WHERE l.status = 'active'
      ORDER BY COALESCE(l.trust_score, 50) DESC
      LIMIT 100
    `
    );

    // Format agent descriptions (Phase 1 feature)
    const agents = res.rows.map(agent => ({
      ...agent,
      description:
        agent.public_description ||
        agent.agent_bio ||
        agent.persona ||
        "Loop",
    }));

    // CACHE THE RESULT (30 min TTL)
    await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, agents, CACHE_TTLS.MARKETPLACE);

    return NextResponse.json({
      agents,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[marketplace] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CACHE INTEGRATION: Activity Feed
// Add to: app/src/app/api/activity/route.ts
// ============================================================================

// At top of /api/activity/route.ts, add:
import { getCacheLayer, CACHE_KEYS, CACHE_TTLS } from "@/lib/cache-layer";

// Modify the activity feed query to use cache:
export async function GET(req: NextRequest) {
  // SECURITY: Rate limiting (Phase 1)
  try {
    const { checkRateLimitActivity } = await import("@/lib/rate-limit");
    if (await checkRateLimitActivity(req)) {
      return NextResponse.json(
        { error: "Too many requests. Max 100 per minute." },
        { status: 429 }
      );
    }
  } catch (rateLimitErr) {
    console.warn("[activity-rate-limit] Check failed, proceeding:", rateLimitErr);
  }

  try {
    const cache = getCacheLayer();
    const sort = new URL(req.url || "http://localhost").searchParams.get("sort") || "new";

    // Cache key includes sort type
    const cacheKey = `${CACHE_KEYS.ACTIVITY_FEED}:${sort}`;

    // TRY CACHE FIRST (2 min TTL for frequently updated feed)
    const cachedFeed = await cache.get(cacheKey);
    if (cachedFeed) {
      return NextResponse.json({
        activities: cachedFeed,
        cached: true,
        sort,
        timestamp: new Date().toISOString(),
      });
    }

    // Continue with existing activity feed logic...
    // (rest of GET function stays the same)

    // At the end, before returning, CACHE THE FEED:
    // await cache.set(cacheKey, activities, CACHE_TTLS.ACTIVITY_FEED);

    return NextResponse.json({
      activities,
      cached: false,
      sort,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[activity] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CACHE INVALIDATION: When agent profile is updated
// Add to: Dashboard profile update endpoint
// ============================================================================

export async function POST(req: NextRequest) {
  // Validate input (Phase 1)
  const body = await req.json().catch(() => ({}));

  try {
    // ... existing update logic ...

    // AFTER successful profile update, invalidate cache:
    const invalidation = getInvalidationManager();
    await invalidation.onAgentProfileUpdate(updatedAgent.loop_tag);

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      cacheInvalidated: true,
    });
  } catch (error) {
    console.error("[profile-update] Failed:", error);
    return NextResponse.json(
      { error: "Profile update failed" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CACHE INVALIDATION: When comment is added
// Add to: app/src/app/api/activity/[id]/comments/route.ts
// ============================================================================

import { getInvalidationManager } from "@/lib/cache-layer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // ... existing comment creation logic ...

    // AFTER comment is created, invalidate post cache:
    const invalidation = getInvalidationManager();
    await invalidation.onCommentAdded(id);

    return NextResponse.json({
      success: true,
      comment: newComment,
      cacheInvalidated: true,
    });
  } catch (error) {
    console.error("[comments] POST failed:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// ============================================================================
// CACHE INVALIDATION: When transaction occurs (hire)
// Add to: app/src/app/api/marketplace/hire/route.ts
// ============================================================================

import { getInvalidationManager } from "@/lib/cache-layer";

export async function POST(req: NextRequest) {
  // ... existing hire logic ...

  try {
    // Create hire transaction
    const transaction = await createHireTransaction(buyerLoopId, agentLoopId, cost);

    // AFTER transaction, invalidate wallet and agent caches:
    const invalidation = getInvalidationManager();
    await invalidation.onTransaction(buyerLoopId);
    await invalidation.onTransaction(agentLoopId);
    await invalidation.onEngagement(agentLoopTag);

    return NextResponse.json({
      success: true,
      transaction,
      cacheInvalidated: true,
    });
  } catch (error) {
    console.error("[hire] POST failed:", error);
    return NextResponse.json(
      { error: "Hire failed" },
      { status: 500 }
    );
  }
}
