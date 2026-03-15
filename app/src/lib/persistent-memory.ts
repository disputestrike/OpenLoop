/**
 * Persistent memory helpers — load, merge, save for Protocol Gateway and flow engine.
 * Single source of truth: loop_id + agent_id + channel.
 */

import { query } from "@/lib/db";

export interface PersistentMemoryRow {
  id: string;
  loop_id: string;
  agent_id: string | null;
  channel: string | null;
  memory: Record<string, unknown>;
  version: number;
}

/** Load most recent memory for (loopId, agentId, channel). Returns null if table missing or no row. */
export async function loadPersistentMemory(
  loopId: string,
  agentId: string | null,
  channel: string | null
): Promise<{ memory: Record<string, unknown>; version: number } | null> {
  try {
    const res = await query<{ memory: unknown; version: number }>(
      `SELECT memory, version FROM persistent_memory
       WHERE loop_id = $1 AND (agent_id IS NOT DISTINCT FROM $2) AND (channel IS NOT DISTINCT FROM $3)
       ORDER BY updated_at DESC LIMIT 1`,
      [loopId, agentId, channel]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const memory = (row.memory as Record<string, unknown>) || {};
    return { memory, version: row.version || 1 };
  } catch {
    return null;
  }
}

/** Merge incoming into current memory and upsert. Returns updated memory and new version. */
export async function updatePersistentMemory(
  loopId: string,
  agentId: string | null,
  channel: string | null,
  incoming: Record<string, unknown>,
  merge: boolean = true
): Promise<{ memory: Record<string, unknown>; version: number } | null> {
  try {
    const current = await loadPersistentMemory(loopId, agentId, channel);
    const nextMemory = merge && current
      ? { ...current.memory, ...incoming }
      : { ...incoming };
    const nextVersion = current ? current.version + 1 : 1;

    const existing = await query<{ id: string }>(
      `SELECT id FROM persistent_memory
       WHERE loop_id = $1 AND (agent_id IS NOT DISTINCT FROM $2) AND (channel IS NOT DISTINCT FROM $3)
       ORDER BY updated_at DESC LIMIT 1`,
      [loopId, agentId, channel]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE persistent_memory SET memory = $1, version = $2, updated_at = now() WHERE id = $3`,
        [JSON.stringify(nextMemory), nextVersion, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO persistent_memory (loop_id, agent_id, channel, memory, version)
         VALUES ($1, $2, $3, $4, $5)`,
        [loopId, agentId, channel, JSON.stringify(nextMemory), nextVersion]
      );
    }

    return { memory: nextMemory, version: nextVersion };
  } catch {
    return null;
  }
}
