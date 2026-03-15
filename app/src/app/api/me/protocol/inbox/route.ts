/**
 * GET /api/me/protocol/inbox
 *
 * Agent Runner: returns protocol events for the current Loop (incoming tasks, offers, etc.)
 * so an external process or runner can poll, detect TASK_REQUESTs, and respond with TASK_OFFER.
 * Supports the full protocol lifecycle across the entire platform.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sender = await getProtocolSender(req);
  if (!sender) {
    return NextResponse.json(
      { error: "Unauthorized. Use session or Authorization: Bearer lk_live_..." },
      { status: 401 }
    );
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 100);
  const since = req.nextUrl.searchParams.get("since"); // ISO timestamp, only events after
  const types = req.nextUrl.searchParams.get("types"); // comma: TASK_REQUEST,TASK_OFFER,...

  try {
    let sql = `
      SELECT id, event_type, from_agent_id, to_agent_id, contract_id, correlation_id, payload, created_at
      FROM protocol_task_events
      WHERE to_agent_id = $1
    `;
    const params: (string | number | string[])[] = [sender.loopId];
    let i = 2;
    if (since) {
      sql += ` AND created_at > $${i}`;
      params.push(since);
      i++;
    }
    if (types) {
      const arr = types.split(",").map((t) => t.trim()).filter(Boolean);
      if (arr.length > 0) {
        sql += ` AND event_type = ANY($${i}::text[])`;
        params.push(arr);
        i++;
      }
    }
    sql += ` ORDER BY created_at DESC LIMIT $${i}`;
    params.push(limit);

    const { rows } = await query<{
      id: string;
      event_type: string;
      from_agent_id: string | null;
      to_agent_id: string | null;
      contract_id: string | null;
      correlation_id: string | null;
      payload: unknown;
      created_at: string;
    }>(sql, params);

    // Resolve from_agent loop_tag for display
    const fromIds = Array.from(new Set(rows.map((r) => r.from_agent_id).filter((id): id is string => Boolean(id))));
    let tags: Record<string, string> = {};
    if (fromIds.length > 0) {
      const tagRes = await query<{ id: string; loop_tag: string | null }>(
        `SELECT id, loop_tag FROM loops WHERE id = ANY($1::uuid[])`,
        [fromIds]
      ).catch(() => ({ rows: [] }));
      tagRes.rows.forEach((r) => { if (r.loop_tag) tags[r.id] = r.loop_tag; });
    }

    const events = rows.map((r) => ({
      id: r.id,
      type: r.event_type,
      fromAgentId: r.from_agent_id,
      fromTag: r.from_agent_id ? tags[r.from_agent_id] ?? null : null,
      toAgentId: r.to_agent_id,
      contractId: r.contract_id,
      correlationId: r.correlation_id,
      payload: r.payload,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      events,
      yourLoopId: sender.loopId,
      hint: "Poll this endpoint; for each TASK_REQUEST send TASK_OFFER via POST /api/protocol/send",
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[protocol/inbox]", e);
    return NextResponse.json(
      { error: "Protocol inbox unavailable. Run migrations (029_protocol_task_events)." },
      { status: 503 }
    );
  }
}
