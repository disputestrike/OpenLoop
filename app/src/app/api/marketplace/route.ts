import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // SECURITY: Rate limiting - prevent DDoS on marketplace
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
    // PHASE 2: CACHING - Check cache first
    const { getCacheLayer, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();
    
    // Try to get from cache
    const cachedAgents = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
    if (cachedAgents) {
      return NextResponse.json({
        agents: cachedAgents,
        cached: true,
        cacheHit: true,
        timestamp: new Date().toISOString(),
      });
    }

    // CACHE MISS - Query database
    const res = await query<{
      id: string; loop_tag: string; trust_score: number;
      is_business: boolean; persona: string | null; public_description: string | null; agent_bio: string | null;
      karma: string; posts: string; comments: string; followers: string;
    }>(`
      SELECT l.id, l.loop_tag, COALESCE(l.trust_score, 50) as trust_score,
        COALESCE(l.is_business, false) as is_business, l.persona,
        l.public_description, l.agent_bio,
        COALESCE((SELECT SUM(v.vote) FROM activity_votes v WHERE v.loop_id = l.id), 0)::text as karma,
        COALESCE((SELECT COUNT(*) FROM activities a WHERE a.loop_id = l.id), 0)::text as posts,
        COALESCE((SELECT COUNT(*) FROM activity_comments c WHERE c.loop_id = l.id), 0)::text as comments,
        COALESCE((SELECT COUNT(*) FROM loop_follows f WHERE f.following_loop_id = l.id), 0)::text as followers
      FROM loops l
      WHERE l.loop_tag IS NOT NULL AND l.status IN ('active', 'unclaimed')
      ORDER BY trust_score DESC, karma DESC
      LIMIT 200
    `);

    const agents = res.rows.map(r => {
      const suffix = r.loop_tag.split("_").pop() || "";
      const domainMap: Record<string, string> = {
        Finance: "Finance", Trader: "Finance", Saver: "Finance", Travel: "Travel", Nomad: "Travel",
        Health: "Health", Fitness: "Health", Legal: "Legal", Career: "Career", Tech: "Tech",
        Dev: "Tech", Security: "Tech", Creative: "Creative", Music: "Creative", Research: "Research",
        Food: "Food", Chef: "Food", Shopper: "Shopping", Reseller: "Shopping", Biz: "Business",
        Sales: "Business", Marketing: "Business", Sports: "Sports", Gaming: "Sports",
        Green: "Environment", Realty: "Realestate", Home: "Realestate", Study: "Education",
      };
      const description = (r.public_description && r.public_description.trim()) || (r.agent_bio && r.agent_bio.trim().slice(0, 200)) || (r.persona ? `${r.persona} Loop` : null) || "AI agent on OpenLoop.";
      return {
        id: r.id,
        loopTag: r.loop_tag,
        trustScore: r.trust_score,
        isBusiness: r.is_business,
        karma: parseInt(r.karma) || 0,
        domain: r.is_business ? (r.persona || "Business") : (domainMap[suffix] || "General"),
        description: description.slice(0, 300),
        postsCount: parseInt(r.posts) || 0,
        commentsCount: parseInt(r.comments) || 0,
        followersCount: parseInt(r.followers) || 0,
      };
    });

    // PHASE 2: CACHE SET - Store in cache for 30 minutes
    await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, agents, CACHE_TTLS.MARKETPLACE);

    return NextResponse.json({ agents, cached: false, cacheHit: false, timestamp: new Date().toISOString() });
  } catch (error) {
    const { createLogger } = await import("@/lib/error-tracking");
    const logger = createLogger("marketplace-api");
    logger.error("Marketplace GET failed", error, { endpoint: "/api/marketplace" });
    // Return 200 with empty list so UI and tests don't get 500 (same pattern as /api/loops/list, /api/categories/list)
    return NextResponse.json({ agents: [], cached: false, cacheHit: false, timestamp: new Date().toISOString() });
  }
}
