/**
 * PHASE 2: CACHE LAYER TESTS
 * Tests that verify caching works correctly
 * 
 * Run: npm test -- __tests__/phase2/cache-tests.test.ts
 */

describe("Phase 2: Cache Layer - Complete Tests", () => {
  const mockAgents = [
    { loopTag: "Sam_Trader", trustScore: 85, avgRating: 4.6 },
    { loopTag: "Jane_Travel", trustScore: 92, avgRating: 4.8 },
  ];

  const mockActivities = [
    { id: "1", text: "Post 1", at: new Date().toISOString() },
    { id: "2", text: "Post 2", at: new Date().toISOString() },
  ];

  describe("CacheLayer Class", () => {
    it("should store and retrieve data", async () => {
      // Create cache instance
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      // Store data
      await cache.set("test:key", mockAgents, 300);

      // Retrieve data
      const retrieved = await cache.get("test:key");
      expect(retrieved).toEqual(mockAgents);
    });

    it("should expire data after TTL", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      // Store with 1 second TTL
      await cache.set("expiring:key", mockAgents, 1);

      // Get immediately (should work)
      let result = await cache.get("expiring:key");
      expect(result).toEqual(mockAgents);

      // Wait 1.1 seconds for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Get after expiration (should be null or undefined)
      result = await cache.get("expiring:key");
      expect(result).toBeNull();
    });

    it("should delete keys", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      await cache.set("delete:key", mockAgents, 300);
      await cache.delete("delete:key");

      const result = await cache.get("delete:key");
      expect(result).toBeNull();
    });

    it("should invalidate pattern", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      // Store multiple keys
      await cache.set("marketplace:agents", mockAgents, 300);
      await cache.set("marketplace:search", mockAgents, 300);
      await cache.set("activity:feed", mockActivities, 300);

      // Invalidate marketplace pattern
      await cache.invalidatePattern("marketplace:*");

      // Check that marketplace keys are gone
      expect(await cache.get("marketplace:agents")).toBeNull();
      expect(await cache.get("marketplace:search")).toBeNull();

      // Check that activity key still exists
      expect(await cache.get("activity:feed")).toEqual(mockActivities);
    });

    it("should batch get multiple keys", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      await cache.set("key1", "value1", 300);
      await cache.set("key2", "value2", 300);
      await cache.set("key3", "value3", 300);

      const results = await cache.mget(["key1", "key2", "key3"]);

      expect(results.key1).toBe("value1");
      expect(results.key2).toBe("value2");
      expect(results.key3).toBe("value3");
    });

    it("should batch set multiple keys", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      await cache.mset(
        {
          key1: "value1",
          key2: "value2",
          key3: "value3",
        },
        300
      );

      expect(await cache.get("key1")).toBe("value1");
      expect(await cache.get("key2")).toBe("value2");
      expect(await cache.get("key3")).toBe("value3");
    });

    it("should getOrCompute (return cached or compute)", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      const computeFn = jest.fn(async () => mockAgents);

      // First call: should compute
      const result1 = await cache.getOrCompute("agents:list", computeFn, 300);
      expect(result1).toEqual(mockAgents);
      expect(computeFn).toHaveBeenCalledTimes(1);

      // Second call: should use cache
      const result2 = await cache.getOrCompute("agents:list", computeFn, 300);
      expect(result2).toEqual(mockAgents);
      expect(computeFn).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should get cache stats", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      await cache.set("stat:key1", "value1", 300);
      await cache.set("stat:key2", "value2", 300);

      const stats = cache.getStats();
      expect(stats.memCacheSize).toBeGreaterThan(0);
      expect(stats.redisConnected).toBeDefined();
    });

    it("should clear all cache", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      await cache.set("clear:key1", "value1", 300);
      await cache.set("clear:key2", "value2", 300);

      await cache.clear();

      expect(await cache.get("clear:key1")).toBeNull();
      expect(await cache.get("clear:key2")).toBeNull();
    });
  });

  describe("Cache Invalidation Manager", () => {
    it("should invalidate marketplace on agent update", async () => {
      const { CacheLayer, CacheInvalidationManager, CACHE_KEYS } = require("@/lib/cache-layer");
      const cache = new CacheLayer();
      const invalidation = new CacheInvalidationManager(cache);

      // Store marketplace agents
      await cache.set(CACHE_KEYS.MARKETPLACE_AGENTS, mockAgents, 300);

      // Invalidate on agent update
      await invalidation.onAgentProfileUpdate("Sam_Trader");

      // Marketplace cache should be cleared
      expect(await cache.get(CACHE_KEYS.MARKETPLACE_AGENTS)).toBeNull();
    });

    it("should invalidate feed on activity posted", async () => {
      const { CacheLayer, CacheInvalidationManager, CACHE_KEYS } = require("@/lib/cache-layer");
      const cache = new CacheLayer();
      const invalidation = new CacheInvalidationManager(cache);

      // Store activity feed
      await cache.set(CACHE_KEYS.ACTIVITY_FEED, mockActivities, 300);

      // Invalidate on activity posted
      await invalidation.onActivityPosted();

      // Activity feed cache should be cleared
      expect(await cache.get(CACHE_KEYS.ACTIVITY_FEED)).toBeNull();
    });

    it("should invalidate post comments on comment added", async () => {
      const { CacheLayer, CacheInvalidationManager, CACHE_KEYS } = require("@/lib/cache-layer");
      const cache = new CacheLayer();
      const invalidation = new CacheInvalidationManager(cache);

      const postId = "post-123";

      // Store post cache
      await cache.set(CACHE_KEYS.ACTIVITY_POST(postId), mockActivities, 300);
      await cache.set(CACHE_KEYS.ACTIVITY_COMMENTS(postId), [{ id: "comment-1" }], 300);

      // Invalidate on comment added
      await invalidation.onCommentAdded(postId);

      // Post caches should be cleared
      expect(await cache.get(CACHE_KEYS.ACTIVITY_POST(postId))).toBeNull();
      expect(await cache.get(CACHE_KEYS.ACTIVITY_COMMENTS(postId))).toBeNull();
    });

    it("should invalidate wallet on transaction", async () => {
      const { CacheLayer, CacheInvalidationManager, CACHE_KEYS } = require("@/lib/cache-layer");
      const cache = new CacheLayer();
      const invalidation = new CacheInvalidationManager(cache);

      const loopId = "loop-123";

      // Store wallet caches
      await cache.set(CACHE_KEYS.WALLET_BALANCE(loopId), 5000, 60);
      await cache.set(CACHE_KEYS.WALLET_TRANSACTIONS(loopId), [], 60);

      // Invalidate on transaction
      await invalidation.onTransaction(loopId);

      // Wallet caches should be cleared
      expect(await cache.get(CACHE_KEYS.WALLET_BALANCE(loopId))).toBeNull();
      expect(await cache.get(CACHE_KEYS.WALLET_TRANSACTIONS(loopId))).toBeNull();
    });

    it("should invalidate agent stats on engagement", async () => {
      const { CacheLayer, CacheInvalidationManager, CACHE_KEYS } = require("@/lib/cache-layer");
      const cache = new CacheLayer();
      const invalidation = new CacheInvalidationManager(cache);

      const loopTag = "Sam_Trader";

      // Store agent caches
      await cache.set(CACHE_KEYS.AGENT_STATS(loopTag), { tasks: 10 }, 300);
      await cache.set(CACHE_KEYS.AGENT_RECENT_POSTS(loopTag), [], 300);

      // Invalidate on engagement
      await invalidation.onEngagement(loopTag);

      // Agent caches should be cleared
      expect(await cache.get(CACHE_KEYS.AGENT_STATS(loopTag))).toBeNull();
      expect(await cache.get(CACHE_KEYS.AGENT_RECENT_POSTS(loopTag))).toBeNull();
    });
  });

  describe("Cache Performance", () => {
    it("should be faster on cache hit than database query", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      // Store 1000 items in cache
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Agent ${i}`,
      }));

      await cache.set("large:dataset", largeData, 300);

      // Time cache retrieval
      const cacheStart = Date.now();
      await cache.get("large:dataset");
      const cacheTime = Date.now() - cacheStart;

      // Cache should be <5ms for 1000 items
      expect(cacheTime).toBeLessThan(5);
    });

    it("should handle concurrent cache operations", async () => {
      const CacheLayer = require("@/lib/cache-layer").CacheLayer;
      const cache = new CacheLayer();

      // Run 100 concurrent operations
      const operations = Array.from({ length: 100 }, async (_, i) => {
        await cache.set(`concurrent:${i}`, { value: i }, 300);
        return cache.get(`concurrent:${i}`);
      });

      const results = await Promise.all(operations);

      // All should succeed
      expect(results.length).toBe(100);
      expect(results.every(r => r !== null)).toBe(true);
    });
  });

  describe("Cache TTL", () => {
    it("should use MARKETPLACE TTL (30 minutes)", () => {
      const { CACHE_TTLS } = require("@/lib/cache-layer");
      expect(CACHE_TTLS.MARKETPLACE).toBe(30 * 60);
    });

    it("should use ACTIVITY_FEED TTL (2 minutes)", () => {
      const { CACHE_TTLS } = require("@/lib/cache-layer");
      expect(CACHE_TTLS.ACTIVITY_FEED).toBe(2 * 60);
    });

    it("should use AGENT_PROFILE TTL (5 minutes)", () => {
      const { CACHE_TTLS } = require("@/lib/cache-layer");
      expect(CACHE_TTLS.AGENT_PROFILE).toBe(5 * 60);
    });

    it("should use WALLET TTL (1 minute)", () => {
      const { CACHE_TTLS } = require("@/lib/cache-layer");
      expect(CACHE_TTLS.WALLET).toBe(1 * 60);
    });
  });
});
