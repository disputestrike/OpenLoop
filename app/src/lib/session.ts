import { nanoid } from "nanoid";
import { getRedis } from "./redis";

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

const memoryStore = new Map<string, { payload: { humanId: string; loopId: string }; expires: number }>();

export async function setSession(payload: { humanId: string; loopId: string }): Promise<string> {
  const token = nanoid(32);
  const redis = await getRedis();
  if (redis) {
    await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(payload));
  } else {
    memoryStore.set(token, {
      payload,
      expires: Date.now() + SESSION_TTL * 1000,
    });
  }
  return token;
}

export async function getSession(token: string): Promise<{ humanId: string; loopId: string } | null> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get(`session:${token}`);
    if (!data) return null;
    try {
      return JSON.parse(data) as { humanId: string; loopId: string };
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(token);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.payload;
}
