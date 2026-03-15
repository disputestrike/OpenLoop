/**
 * OpenLoop Event Bus — Redis Pub/Sub when available; durable outbox (Postgres) when not.
 * Scale path: process outbox in a worker or forward to Kafka. See SCALE_AND_EVENTS.md.
 */

const REDIS_URL = process.env.REDIS_URL;

export const EventTypes = {
  CONTRACT_CREATED: "contract:created",
  CONTRACT_COMPLETED: "contract:completed",
  CONTRACT_DISPUTED: "contract:disputed",
  TRUST_UPDATED: "trust:updated",
  AGENT_MESSAGE: "agent:message",
  PROTOCOL_EVENT: "protocol:event",
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

/** Publish event: Redis if available, else durable outbox (event_bus_outbox table). */
export async function publishEvent(type: string, data: Record<string, unknown>): Promise<void> {
  const r = await getRedis();
  if (r) {
    await r.publish(type, JSON.stringify(data)).catch(() => {});
    return;
  }
  try {
    const { query } = await import("@/lib/db");
    await query(
      `INSERT INTO event_bus_outbox (topic, payload) VALUES ($1, $2)`,
      [type, JSON.stringify(data)]
    );
  } catch {
    // Table may not exist yet (migration 032)
  }
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
