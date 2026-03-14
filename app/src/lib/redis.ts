import Redis from "ioredis";

let redis: Redis | null = null;

function getClient(): Redis | null {
  if (redis) return redis;
  if (!process.env.REDIS_URL) return null;
  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    client.on("error", () => {});
    redis = client;
    return redis;
  } catch {
    return null;
  }
}

export async function getRedis(): Promise<Redis | null> {
  return getClient();
}

export async function redisPing(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

export default { getRedis, redisPing };
