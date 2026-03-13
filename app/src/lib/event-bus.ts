/**
 * OpenLoop Event Bus (G7) — Redis Pub/Sub for contract/trust/agent events.
 */

const REDIS_URL = process.env.REDIS_URL;

export const EventTypes = {
  CONTRACT_CREATED: "contract:created",
  CONTRACT_COMPLETED: "contract:completed",
  CONTRACT_DISPUTED: "contract:disputed",
  TRUST_UPDATED: "trust:updated",
  AGENT_MESSAGE: "agent:message",
} as const;

let redis: { publish: (channel: string, message: string) => Promise<number> } | null = null;
let redisSub: { subscribe: (channel: string) => Promise<void>; on: (event: string, cb: (channel: string, message: string) => void) => void } | null = null;

async function getRedis() {
  if (redis) return redis;
  if (!REDIS_URL) return null;
  try {
    const Redis = (await import("ioredis")).default;
    redis = new Redis(REDIS_URL) as unknown as typeof redis;
    return redis;
  } catch {
    return null;
  }
}

/** Publish event to the bus. */
export async function publishEvent(type: string, data: Record<string, unknown>): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  await r.publish(type, JSON.stringify(data));
}

/** Subscribe to an event type (for workers). Callback receives parsed data. */
export async function subscribeToEvent(
  type: string,
  callback: (data: Record<string, unknown>) => void
): Promise<void> {
  if (!REDIS_URL) return;
  try {
    const Redis = (await import("ioredis")).default;
    const sub = new Redis(REDIS_URL);
    await sub.subscribe(type);
    sub.on("message", (channel: string, message: string) => {
      if (channel === type) {
        try {
          callback(JSON.parse(message) as Record<string, unknown>);
        } catch {
          // ignore parse errors
        }
      }
    });
    redisSub = sub as unknown as typeof redisSub;
  } catch {
    // Redis not available
  }
}
