/**
 * Rate limiter with Redis backing for multi-instance Railway deploys.
 * Falls back to in-memory if Redis is unavailable.
 */
import { getRedis } from "@/lib/redis";

const WINDOW_MS = 60_000; // 1 minute
const LIMITS = {
  claim:     10,
  loops_post: 20,
  chat:      120,
  api:       300,
};

// In-memory fallback
const memStore = new Map<string, { count: number; resetAt: number }>();

function memCheck(key: string, max: number): boolean {
  const now = Date.now();
  let entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

async function redisCheck(key: string, max: number): Promise<boolean> {
  try {
    const client = await getRedis();
    if (!client) return memCheck(key, max);
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, Math.floor(WINDOW_MS / 1000));
    }
    return current > max;
  } catch {
    return memCheck(key, max);
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export async function checkRateLimitClaim(req: Request): Promise<boolean> {
  const ip = getClientIp(req);
  return redisCheck(`rl:claim:${ip}`, LIMITS.claim);
}

export async function checkRateLimitLoopsPost(req: Request): Promise<boolean> {
  const ip = getClientIp(req);
  return redisCheck(`rl:loops:${ip}`, LIMITS.loops_post);
}

export async function checkRateLimitChat(req: Request): Promise<boolean> {
  const ip = getClientIp(req);
  return redisCheck(`rl:chat:${ip}`, LIMITS.chat);
}
