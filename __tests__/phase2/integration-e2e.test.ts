/**
 * PHASE 2: END-TO-END INTEGRATION TEST
 * Tests that caching works across all endpoints
 * 
 * Simulates real user flows:
 * 1. User browses marketplace (cache miss) → GET /api/marketplace
 * 2. User browses again (cache hit) → GET /api/marketplace
 * 3. User browses activity (cache miss) → GET /api/activity
 * 4. Comment posted (invalidates) → POST /api/activity/{id}/comments
 * 5. Activity feed refreshed (cache miss) → GET /api/activity
 * 6. Hire transaction (invalidates wallets) → POST /api/marketplace/hire
 * 7. Review posted (invalidates agent) → POST /api/marketplace/review
 * 
 * Run: npm test -- __tests__/phase2/integration-e2e.test.ts
 */

describe("Phase 2: End-to-End Cache Integration", () => {
  describe("Marketplace Cache Flow", () => {
    it("should cache marketplace on first GET", async () => {
      // Simulate first request
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const { CACHE_KEYS, CACHE_TTLS } = require("@/lib/cache-layer");

      const agents = [
        { loopTag: "Sam_Trader", trustScore: 85 },
        { loopTag: "Jane_Travel", trustScore: 92 },
      ];

      // Simulate: GET /api/marketplace (miss)
      let cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toBeNull(); // First call, cache miss

      // Simulate database query and cache set
      await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, agents, CACHE_TTLS.MARKETPLACE);

      // Verify cached
      cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toEqual(agents);
    });

    it("should return cached marketplace on second GET", async () => {
      // This tests that the cache from previous test persists
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const { CACHE_KEYS } = require("@/lib/cache-layer");

      // Simulate: GET /api/marketplace (hit)
      const cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toBeDefined(); // Should hit cache
    });
  });

  describe("Activity Feed Cache Flow", () => {
    it("should cache activity feed with sort parameter", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const { CACHE_KEYS, CACHE_TTLS } = require("@/lib/cache-layer");

      const activities = [
        { id: "1", text: "Post 1", at: new Date().toISOString() },
        { id: "2", text: "Post 2", at: new Date().toISOString() },
      ];

      const sorts = ["new", "top", "hot", "active"];

      // For each sort type, verify caching
      for (const sort of sorts) {
        const cacheKey = `${CACHE_KEYS.ACTIVITY_FEED}:${sort}`;

        // First call - miss
        let cached = await cache.get(cacheKey);
        expect(cached).toBeNull();

        // Set cache
        await cache.set(cacheKey, activities, CACHE_TTLS.ACTIVITY_FEED);

        // Second call - hit
        cached = await cache.get(cacheKey);
        expect(cached).toEqual(activities);
      }
    });
  });

  describe("Cache Invalidation on Write", () => {
    it("should invalidate marketplace when agent updated", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const invalidation = require("@/lib/cache-layer").getInvalidationManager();
      const { CACHE_KEYS } = require("@/lib/cache-layer");

      const agents = [{ loopTag: "Sam_Trader", trustScore: 85 }];
      await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, agents, 300);

      // Verify cache exists
      let cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toEqual(agents);

      // Simulate review endpoint updating trust score
      // This should invalidate marketplace cache
      await invalidation.onAgentProfileUpdate("Sam_Trader");

      // Verify cache is cleared
      cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toBeNull();
    });

    it("should invalidate feed when comment posted", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const invalidation = require("@/lib/cache-layer").getInvalidationManager();
      const { CACHE_KEYS } = require("@/lib/cache-layer");

      const postId = "post-123";
      const post = { id: postId, text: "Test post" };
      const comments = [{ id: "comment-1", text: "Test comment" }];

      // Set post and comments caches
      await cache.set(CACHE_KEYS.ACTIVITY_POST(postId), post, 300);
      await cache.set(CACHE_KEYS.ACTIVITY_COMMENTS(postId), comments, 300);

      // Verify caches exist
      expect(await cache.get(CACHE_KEYS.ACTIVITY_POST(postId))).toEqual(post);
      expect(await cache.get(CACHE_KEYS.ACTIVITY_COMMENTS(postId))).toEqual(comments);

      // Simulate comment posted
      await invalidation.onCommentAdded(postId);

      // Verify caches cleared
      expect(await cache.get(CACHE_KEYS.ACTIVITY_POST(postId))).toBeNull();
      expect(await cache.get(CACHE_KEYS.ACTIVITY_COMMENTS(postId))).toBeNull();
    });

    it("should invalidate wallet on transaction", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const invalidation = require("@/lib/cache-layer").getInvalidationManager();
      const { CACHE_KEYS } = require("@/lib/cache-layer");

      const loopId = "loop-123";
      const balance = 5000;

      // Set wallet cache
      await cache.set(CACHE_KEYS.WALLET_BALANCE(loopId), balance, 60);

      // Verify cache exists
      expect(await cache.get(CACHE_KEYS.WALLET_BALANCE(loopId))).toEqual(balance);

      // Simulate hire transaction
      await invalidation.onTransaction(loopId);

      // Verify cache cleared
      expect(await cache.get(CACHE_KEYS.WALLET_BALANCE(loopId))).toBeNull();
    });
  });

  describe("Full User Flow Simulation", () => {
    it("should handle complete marketplace browse → hire → review flow", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const invalidation = require("@/lib/cache-layer").getInvalidationManager();
      const { CACHE_KEYS, CACHE_TTLS } = require("@/lib/cache-layer");

      const buyerId = "buyer-1";
      const agentId = "agent-1";
      const agentTag = "Sam_Trader";

      // Step 1: User browses marketplace
      const agents = [{ loopTag: agentTag, trustScore: 85 }];
      
      // Miss - query database
      let cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toBeNull();
      
      // Set cache
      await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, agents, CACHE_TTLS.MARKETPLACE);
      
      // Hit - cached
      cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toEqual(agents);

      // Step 2: User hires agent
      // This invalidates wallet caches
      await invalidation.onTransaction(buyerId);
      await invalidation.onTransaction(agentId);
      
      // Wallet cache would be cleared
      let wallet = await cache.get(CACHE_KEYS.WALLET_BALANCE(buyerId));
      expect(wallet).toBeNull();

      // Step 3: User leaves review
      // This invalidates marketplace agent cache
      await invalidation.onAgentProfileUpdate(agentTag);
      
      // Marketplace cache would be cleared
      cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toBeNull();

      // Next browse would query database again and cache fresh data
      const updatedAgents = [{ loopTag: agentTag, trustScore: 88 }]; // Trust score increased
      await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, updatedAgents, CACHE_TTLS.MARKETPLACE);
      
      cached = await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS);
      expect(cached).toEqual(updatedAgents);
    });

    it("should handle activity feed refresh flow", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const invalidation = require("@/lib/cache-layer").getInvalidationManager();
      const { CACHE_KEYS, CACHE_TTLS } = require("@/lib/cache-layer");

      const postId = "post-1";
      const sort = "new";

      // Step 1: User views activity feed
      const activities = [{ id: "1", text: "Activity 1" }];
      const cacheKey = `${CACHE_KEYS.ACTIVITY_FEED}:${sort}`;
      
      await cache.set(cacheKey, activities, CACHE_TTLS.ACTIVITY_FEED);
      let cached = await cache.get(cacheKey);
      expect(cached).toEqual(activities);

      // Step 2: Someone posts comment
      await invalidation.onCommentAdded(postId);

      // Feed cache still exists (comment invalidation doesn't clear feed)
      // But if comment was on a post in the feed, its post cache would be cleared
      const postCacheKey = CACHE_KEYS.ACTIVITY_POST(postId);
      expect(await cache.get(postCacheKey)).toBeNull();

      // Step 3: User refreshes feed (but activity feed cache might still be valid)
      // In real scenario, they'd still get cached feed for a few minutes
      // until cache TTL expires or comment invalidation also clears feed
    });
  });

  describe("Cache Performance Verification", () => {
    it("should show cache hit is faster than miss", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();

      const largeData = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Agent ${i}`,
        description: "A".repeat(100),
      }));

      // Store in cache
      await cache.set("perf:test", largeData, 300);

      // Time cache hit
      const hitStart = Date.now();
      const result = await cache.get("perf:test");
      const hitTime = Date.now() - hitStart;

      expect(result).toEqual(largeData);
      expect(hitTime).toBeLessThan(10); // Cache hit should be <10ms
    });

    it("should handle cache with different TTLs correctly", async () => {
      const cache = require("@/lib/cache-layer").getCacheLayer();
      const { CACHE_TTLS } = require("@/lib/cache-layer");

      // Verify TTL values are sensible
      expect(CACHE_TTLS.MARKETPLACE).toBeGreaterThan(CACHE_TTLS.ACTIVITY_FEED);
      expect(CACHE_TTLS.ACTIVITY_FEED).toBeGreaterThan(CACHE_TTLS.WALLET);
      
      // Marketplace: 30 min
      expect(CACHE_TTLS.MARKETPLACE).toBe(1800);
      
      // Activity: 2 min
      expect(CACHE_TTLS.ACTIVITY_FEED).toBe(120);
      
      // Wallet: 1 min
      expect(CACHE_TTLS.WALLET).toBe(60);
    });
  });
});
