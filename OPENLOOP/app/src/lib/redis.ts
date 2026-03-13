import Redis from "ioredis";

const redis =
  process.env.REDIS_URL ?
    new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

export async function getRedis(): Promise<Redis | null> {
  return redis;
}

export async function redisPing(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export default redis;
