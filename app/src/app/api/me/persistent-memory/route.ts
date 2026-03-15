/**
 * Persistent Memory API — Universal context per loop + agent + channel.
 * GET: return memory for this loop (optional filter by agentId, channel).
 * PATCH: merge or set memory (upsert by loop_id + agent_id + channel).
 * DELETE: clear memory for this loop (optional scope by agentId, channel).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type PersistentMemoryRow = {
  id: string;
  loop_id: string;
  agent_id: string | null;
  channel: string | null;
  session_id: string | null;
  memory: unknown;
  version: number;
  created_at: string;
  updated_at: string;
};

/** GET /api/me/persistent-memory?agentId=uuid&channel=telegram|web|sdk */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId")?.trim() || null;
  const channel = searchParams.get("channel")?.trim() || null;

  try {
    let sql = `SELECT id, loop_id, agent_id, channel, session_id, memory, version, created_at, updated_at
               FROM persistent_memory WHERE loop_id = $1`;
    const params: (string | null)[] = [session.loopId];
    let i = 2;
    if (agentId) {
      sql += ` AND (agent_id = $${i} OR agent_id IS NULL)`;
      params.push(agentId);
      i++;
    }
    if (channel !== null) {
      sql += ` AND (channel = $${i} OR channel IS NULL)`;
      params.push(channel);
      i++;
    }
    sql += ` ORDER BY updated_at DESC`;

    const result = await query<PersistentMemoryRow>(sql, params);
    const items = result.rows.map((r) => ({
      id: r.id,
      loopId: r.loop_id,
      agentId: r.agent_id,
      channel: r.channel,
      sessionId: r.session_id,
      memory: r.memory,
      version: r.version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({ items, yourLoopId: session.loopId });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[persistent-memory GET]", e);
    return NextResponse.json(
      { error: "Persistent memory unavailable.", items: [] },
      { status: 200 }
    );
  }
}

/** PATCH /api/me/persistent-memory — body: { agentId?, channel?, memory: object, merge?: boolean } */
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { agentId?: string; channel?: string; memory?: Record<string, unknown>; merge?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agentId = body.agentId?.trim() || null;
  const channel = body.channel?.trim() || null;
  const memory = body.memory && typeof body.memory === "object" ? body.memory : {};
  const merge = body.merge !== false;

  try {
    const existing = await query<PersistentMemoryRow>(
      `SELECT id, memory, version FROM persistent_memory
       WHERE loop_id = $1 AND (agent_id IS NOT DISTINCT FROM $2) AND (channel IS NOT DISTINCT FROM $3)
       ORDER BY updated_at DESC LIMIT 1`,
      [session.loopId, agentId, channel]
    );

    let newMemory: Record<string, unknown>;
    let newVersion: number;

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const current = (row.memory as Record<string, unknown>) || {};
      newMemory = merge ? { ...current, ...memory } : memory;
      newVersion = (row.version || 1) + 1;
      await query(
        `UPDATE persistent_memory SET memory = $1, version = $2, updated_at = now() WHERE id = $3`,
        [JSON.stringify(newMemory), newVersion, row.id]
      );
    } else {
      newMemory = merge ? { ...memory } : memory;
      newVersion = 1;
      await query(
        `INSERT INTO persistent_memory (loop_id, agent_id, channel, memory, version)
         VALUES ($1, $2, $3, $4, $5)`,
        [session.loopId, agentId, channel, JSON.stringify(newMemory), newVersion]
      );
    }

    return NextResponse.json({
      ok: true,
      memory: newMemory,
      version: newVersion,
      yourLoopId: session.loopId,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[persistent-memory PATCH]", e);
    return NextResponse.json(
      { error: "Failed to update persistent memory." },
      { status: 503 }
    );
  }
}

/** DELETE /api/me/persistent-memory?agentId=uuid&channel=telegram — clear scoped or all memory for this loop */
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId")?.trim() || null;
  const channel = searchParams.get("channel")?.trim() || null;

  try {
    let sql = `DELETE FROM persistent_memory WHERE loop_id = $1`;
    const params: (string | null)[] = [session.loopId];
    let i = 2;
    if (agentId !== null && agentId !== "") {
      sql += ` AND agent_id = $${i}`;
      params.push(agentId);
      i++;
    }
    if (channel !== null && channel !== "") {
      sql += ` AND channel = $${i}`;
      params.push(channel);
      i++;
    }
    const result = await query(sql, params);
    const deleted = (result as { rowCount?: number }).rowCount ?? 0;

    return NextResponse.json({ ok: true, deleted, yourLoopId: session.loopId });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[persistent-memory DELETE]", e);
    return NextResponse.json(
      { error: "Failed to clear persistent memory." },
      { status: 503 }
    );
  }
}
