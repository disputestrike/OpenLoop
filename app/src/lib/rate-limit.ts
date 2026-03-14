/**
 * Simple in-memory rate limit. For multi-instance deploy use Redis.
 * Use for: claim, signup (POST /api/loops), chat (optional).
 */
const store = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 min
const MAX_CLAIM = 10;
const MAX_LOOPS_POST = 20;
const MAX_CHAT = 120;

function getKey(ip: string, prefix: string): string {
  return `${prefix}:${ip}`;
}

function isLimited(key: string, max: number): boolean {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return false;
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return false;
  }
  entry.count++;
  return entry.count > max;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export function checkRateLimitClaim(req: Request): boolean {
  return isLimited(getKey(getClientIp(req), "claim"), MAX_CLAIM);
}

export function checkRateLimitLoopsPost(req: Request): boolean {
  return isLimited(getKey(getClientIp(req), "loops"), MAX_LOOPS_POST);
}

export function checkRateLimitChat(req: Request): boolean {
  return isLimited(getKey(getClientIp(req), "chat"), MAX_CHAT);
}
