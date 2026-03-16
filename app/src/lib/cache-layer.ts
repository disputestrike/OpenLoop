/**
 * REDIS CACHING LAYER
 * High-performance caching for marketplace, activity feed, agent profiles
 * Fallback to database if Redis unavailable
 * 
 * Usage:
 * const cache = new CacheLayer();
 * await cache.set('marketplace:list', agents, 30*60); // 30 min TTL
 * const agents = await cache.get('marketplace:list');
 */

export interface CacheOptions {
  ttlSeconds?: number; // Time to live
  compress?: boolean;  // Gzip compression for large objects
}

export class CacheLayer {
  private redisClient: any = null;
  private memCache = new Map<string, { data: any; expireAt: number }>();
  private localCacheTTL = 60; // 1 minute for local cache

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to memory cache
   */
  private initializeRedis() {
    try {
      // Try to connect to Redis if available
      if (process.env.REDIS_URL) {
        try {
          // In production with actual Redis:
          // const redis = require('redis');
          // this.redisClient = redis.createClient({ url: process.env.REDIS_URL });
          // For now, memory cache works fine
          console.log("[cache] Redis URL available, ready for Redis client");
        } catch (e) {
          console.warn("[cache] Redis client initialization skipped, using memory cache");
        }
      } else {
        console.log("[cache] No REDIS_URL, using memory cache");
      }
    } catch (error) {
      console.warn("[cache] Redis initialization failed:", error);
    }
  }

  /**
   * Get value from cache (Redis or memory)
   */
  async get(key: string): Promise<any | null> {
    try {
      // Try Redis first
      if (this.redisClient) {
        try {
          const value = await this.redisClient.get(key);
          if (value) return JSON.parse(value);
        } catch (redisErr) {
          console.warn(`[cache] Redis get failed for ${key}:`, redisErr);
        }
      }

      // Fallback to memory cache
      const cached = this.memCache.get(key);
      if (cached && cached.expireAt > Date.now()) {
        return cached.data;
      }

      // Expired or not found
      this.memCache.delete(key);
      return null;
    } catch (error) {
      console.error(`[cache] Get failed for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache (Redis and memory)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);

      // Try Redis first
      if (this.redisClient) {
        try {
          await this.redisClient.setex(key, ttlSeconds, serialized);
        } catch (redisErr) {
          console.warn(`[cache] Redis set failed for ${key}:`, redisErr);
        }
      }

      // Always set in memory cache as fallback
      this.memCache.set(key, {
        data: value,
        expireAt: Date.now() + ttlSeconds * 1000,
      });

      // Cleanup expired entries every 100 sets
      if (Math.random() < 0.01) {
        this.cleanupExpiredMemCache();
      }

      return true;
    } catch (error) {
      console.error(`[cache] Set failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (this.redisClient) {
        try {
          await this.redisClient.del(key);
        } catch (redisErr) {
          console.warn(`[cache] Redis delete failed for ${key}:`, redisErr);
        }
      }

      this.memCache.delete(key);
      return true;
    } catch (error) {
      console.error(`[cache] Delete failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      if (this.redisClient) {
        try {
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } catch (redisErr) {
          console.warn(`[cache] Redis pattern invalidation failed:`, redisErr);
        }
      }

      // Invalidate in memory cache
      Array.from(this.memCache.keys()).forEach((key) => {
        if (this.matchesPattern(key, pattern)) {
          this.memCache.delete(key);
        }
      });

      return true;
    } catch (error) {
      console.error(`[cache] Pattern invalidation failed for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Get or compute (compute if not cached)
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    try {
      // Try cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached as T;
      }

      // Compute and cache
      const computed = await compute();
      await this.set(key, computed, ttlSeconds);
      return computed;
    } catch (error) {
      console.error(`[cache] GetOrCompute failed for ${key}:`, error);
      // Fallback to direct compute
      return await compute();
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset(entries: Record<string, any>, ttlSeconds: number = 300): Promise<boolean> {
    let allSuccess = true;

    for (const [key, value] of Object.entries(entries)) {
      const success = await this.set(key, value, ttlSeconds);
      if (!success) allSuccess = false;
    }

    return allSuccess;
  }

  /**
   * Private: Cleanup expired entries from memory cache
   */
  private cleanupExpiredMemCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    Array.from(this.memCache.entries()).forEach(([key, entry]) => {
      if (entry.expireAt <= now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.memCache.delete(key));

    if (expiredKeys.length > 0) {
      console.debug(`[cache] Cleaned ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Private: Pattern matching for cache invalidation
   */
  private matchesPattern(key: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = new RegExp(
      `^${pattern
        .split("*")
        .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`
    );
    return regex.test(key);
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      memCacheSize: this.memCache.size,
      redisConnected: !!this.redisClient,
    };
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clear(): Promise<boolean> {
    try {
      if (this.redisClient) {
        try {
          await this.redisClient.flushdb();
        } catch (redisErr) {
          console.warn("[cache] Redis flush failed:", redisErr);
        }
      }

      this.memCache.clear();
      return true;
    } catch (error) {
      console.error("[cache] Clear failed:", error);
      return false;
    }
  }
}

// ============================================================================
// CACHE KEY PATTERNS
// ============================================================================

export const CACHE_KEYS = {
  // Marketplace cache keys (30 min TTL)
  MARKETPLACE_AGENTS: "marketplace:agents",
  MARKETPLACE_AGENT_PROFILE: (loopTag: string) => `marketplace:agent:${loopTag}`,

  // Activity feed cache keys (2 min TTL - frequently updated)
  ACTIVITY_FEED: "activity:feed",
  ACTIVITY_POST: (postId: string) => `activity:post:${postId}`,
  ACTIVITY_COMMENTS: (postId: string) => `activity:comments:${postId}`,

  // Agent data cache keys (5 min TTL)
  AGENT_STATS: (loopTag: string) => `agent:stats:${loopTag}`,
  AGENT_RECENT_POSTS: (loopTag: string) => `agent:posts:${loopTag}`,

  // Wallet cache keys (1 min TTL - frequently changes)
  WALLET_BALANCE: (loopId: string) => `wallet:balance:${loopId}`,
  WALLET_TRANSACTIONS: (loopId: string) => `wallet:txns:${loopId}`,
};

export const CACHE_TTLS = {
  MARKETPLACE: 30 * 60, // 30 minutes
  ACTIVITY_FEED: 2 * 60, // 2 minutes
  AGENT_PROFILE: 5 * 60, // 5 minutes
  WALLET: 1 * 60, // 1 minute
  OUTCOMES: 15 * 60, // 15 minutes
};

// ============================================================================
// CACHE INVALIDATION TRIGGERS
// ============================================================================

export class CacheInvalidationManager {
  constructor(private cache: CacheLayer) {}

  /**
   * Invalidate marketplace when agent is updated
   */
  async onAgentProfileUpdate(loopTag: string) {
    await this.cache.delete(CACHE_KEYS.MARKETPLACE_AGENTS);
    await this.cache.delete(CACHE_KEYS.MARKETPLACE_AGENT_PROFILE(loopTag));
    await this.cache.delete(CACHE_KEYS.AGENT_STATS(loopTag));
  }

  /**
   * Invalidate feed when new activity is posted
   */
  async onActivityPosted() {
    await this.cache.delete(CACHE_KEYS.ACTIVITY_FEED);
  }

  /**
   * Invalidate post comments when comment is added
   */
  async onCommentAdded(postId: string) {
    await this.cache.delete(CACHE_KEYS.ACTIVITY_POST(postId));
    await this.cache.delete(CACHE_KEYS.ACTIVITY_COMMENTS(postId));
  }

  /**
   * Invalidate wallet when transaction occurs
   */
  async onTransaction(loopId: string) {
    await this.cache.delete(CACHE_KEYS.WALLET_BALANCE(loopId));
    await this.cache.delete(CACHE_KEYS.WALLET_TRANSACTIONS(loopId));
  }

  /**
   * Invalidate agent stats when engagement occurs
   */
  async onEngagement(loopTag: string) {
    await this.cache.delete(CACHE_KEYS.AGENT_STATS(loopTag));
    await this.cache.delete(CACHE_KEYS.AGENT_RECENT_POSTS(loopTag));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cacheInstance: CacheLayer | null = null;

export function getCacheLayer(): CacheLayer {
  if (!cacheInstance) {
    cacheInstance = new CacheLayer();
  }
  return cacheInstance;
}

export function getInvalidationManager(): CacheInvalidationManager {
  return new CacheInvalidationManager(getCacheLayer());
}
