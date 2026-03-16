/**
 * GET /api/marketplace/search
 * Search and filter agents by domain, rating, trust score, verification
 * 
 * Query params:
 * - domain: string (finance, travel, health, legal)
 * - minRating: number (1-5)
 * - minTrust: number (0-100)
 * - verified: boolean
 * - sortBy: "rating" | "trust" | "newest" | "earnings"
 * - limit: number (1-100)
 * - offset: number
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("marketplace-search");

export async function GET(req: NextRequest) {
  // SECURITY: Rate limiting
  try {
    const { checkRateLimitMarketplace } = await import("@/lib/rate-limit");
    if (await checkRateLimitMarketplace(req)) {
      return NextResponse.json(
        { error: "Too many requests. Max 500 per minute." },
        { status: 429 }
      );
    }
  } catch (rateLimitErr) {
    logger.warn("Rate limit check failed", { error: rateLimitErr });
  }

  try {
    // PHASE 2: CACHING
    const { getCacheLayer, CACHE_KEYS } = await import("@/lib/cache-layer");
    const cache = getCacheLayer();

    // Parse query parameters
    const url = new URL(req.url);
    const domain = url.searchParams.get("domain") || undefined;
    const minRating = url.searchParams.get("minRating") ? parseFloat(url.searchParams.get("minRating")!) : undefined;
    const minTrust = url.searchParams.get("minTrust") ? parseInt(url.searchParams.get("minTrust")!) : undefined;
    const verified = url.searchParams.get("verified") === "true" ? true : undefined;
    const sortBy = url.searchParams.get("sortBy") || "trust";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Create cache key based on filters
    const cacheKey = `marketplace:search:${domain}:${minRating}:${minTrust}:${verified}:${sortBy}:${limit}:${offset}`;
    const cachedResults = await cache.get(cacheKey);
    if (cachedResults) {
      return NextResponse.json({ results: cachedResults, cached: true });
    }

    // Build dynamic SQL query
    let sql = `
      SELECT 
        l.id, l.loop_tag, l.trust_score, l.persona, l.public_description, l.agent_bio,
        COALESCE((SELECT AVG(CAST(r.rating AS DECIMAL)) FROM reviews r WHERE r.loop_id = l.id), 0)::numeric(3,2) as avg_rating,
        COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.seller_id = l.id AND t.status = 'completed'), 0) as successful_hires,
        COALESCE((SELECT COUNT(*) FROM agent_verifications av WHERE av.loop_id = l.id), 0) as verification_count,
        COALESCE((SELECT COUNT(*) FROM loop_follows f WHERE f.following_loop_id = l.id), 0) as followers_count,
        COALESCE((SELECT SUM(t.amount_cents) FROM transactions t WHERE t.seller_id = l.id AND t.status = 'completed'), 0) as total_earnings_cents
      FROM loops l
      WHERE l.status = 'active'
    `;

    const params: any[] = [];

    // Domain filter
    if (domain) {
      sql += ` AND (l.persona ILIKE $${params.length + 1} OR l.business_category ILIKE $${params.length + 1})`;
      params.push(`%${domain}%`);
    }

    // Rating filter
    if (minRating !== undefined) {
      sql += ` AND COALESCE((SELECT AVG(CAST(r.rating AS DECIMAL)) FROM reviews r WHERE r.loop_id = l.id), 0) >= $${params.length + 1}`;
      params.push(minRating);
    }

    // Trust score filter
    if (minTrust !== undefined) {
      sql += ` AND COALESCE(l.trust_score, 50) >= $${params.length + 1}`;
      params.push(minTrust);
    }

    // Verified filter
    if (verified) {
      sql += ` AND EXISTS (SELECT 1 FROM agent_verifications WHERE loop_id = l.id)`;
    }

    // Sorting
    switch (sortBy) {
      case "rating":
        sql += ` ORDER BY (SELECT AVG(CAST(r.rating AS DECIMAL)) FROM reviews r WHERE r.loop_id = l.id) DESC`;
        break;
      case "newest":
        sql += ` ORDER BY l.created_at DESC`;
        break;
      case "earnings":
        sql += ` ORDER BY (SELECT COALESCE(SUM(t.amount_cents), 0) FROM transactions t WHERE t.seller_id = l.id AND t.status = 'completed') DESC`;
        break;
      case "trust":
      default:
        sql += ` ORDER BY COALESCE(l.trust_score, 50) DESC`;
    }

    // Pagination
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Execute query
    const result = await query<any>(sql, params);

    const results = result.rows.map(r => ({
      loopTag: r.loop_tag,
      trustScore: r.trust_score || 50,
      avgRating: parseFloat(r.avg_rating) || 0,
      successfulHires: r.successful_hires || 0,
      verifications: r.verification_count || 0,
      followers: r.followers_count || 0,
      totalEarnings: r.total_earnings_cents || 0,
      description: r.public_description || r.agent_bio || r.persona || "AI Agent",
    }));

    // PHASE 2: CACHE - Store for 5 minutes
    await cache.set(cacheKey, results, 300);

    return NextResponse.json({
      results,
      total: results.length,
      limit,
      offset,
      cached: false,
    });
  } catch (error) {
    logger.error("Search failed", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
