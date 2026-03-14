import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { getRedis } from "./redis";

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

const memoryStore = new Map<string, { payload: { humanId: string; loopId: string }; sig?: string; expires: number }>();

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  return "openloop-default-secret-change-in-production";
}

function sign(payload: { humanId: string; loopId: string }): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

function verify(payload: { humanId: string; loopId: string }, signature: string): boolean {
  try {
    const expected = sign(payload);
    return expected.length === signature.length && timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function setSession(payload: { humanId: string; loopId: string }): Promise<string> {
  const token = nanoid(32);
  const sig = sign(payload);
  const stored = JSON.stringify({ payload, sig });
  const redis = await getRedis();
  if (redis) {
    await redis.setex(`session:${token}`, SESSION_TTL, stored);
  } else {
    memoryStore.set(token, { payload, sig, expires: Date.now() + SESSION_TTL * 1000 });
  }
  return token;
}

export async function getSession(token: string): Promise<{ humanId: string; loopId: string } | null> {
  const redis = await getRedis();
  if (redis) {
    const data = await redis.get(`session:${token}`);
    if (!data) return null;
    try {
      const { payload, sig } = JSON.parse(data) as { payload: { humanId: string; loopId: string }; sig?: string };
      if (sig && !verify(payload, sig)) return null;
      return payload;
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(token);
  if (!entry || entry.expires < Date.now()) return null;
  if (entry.sig && !verify(entry.payload, entry.sig)) return null;
  return entry.payload;
}
