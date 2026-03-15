/**
 * Protocol Gateway: POST /api/protocol/send
 *
 * Receives protocol messages (TASK_REQUEST, TASK_OFFER, ...), validates schema,
 * records to protocol_task_events, routes to target agent (inbox + optional contract),
 * and optionally notifies via webhook. This is the runtime layer for the Universal
 * Agent Protocol. See AGENT_PROTOCOL_NETWORK.md and agent-protocol-types.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";
import { updatePersistentMemory } from "@/lib/persistent-memory";
import {
  PROTOCOL_MESSAGE_TYPES,
  type AgentProtocolMessage,
  type ProtocolMessageType,
} from "@/lib/agent-protocol-types";

export const dynamic = "force-dynamic";

const VALID_TYPES: ProtocolMessageType[] = Object.values(PROTOCOL_MESSAGE_TYPES);

function isValidMessageType(t: string): t is ProtocolMessageType {
  return VALID_TYPES.includes(t as ProtocolMessageType);
}

/** Resolve to_agent_id from payload (toAgentId UUID or toLoopTag) */
async function resolveToAgentId(
  payload: AgentProtocolMessage
): Promise<string | null> {
  const toId = (payload as { toAgentId?: string }).toAgentId;
  if (toId) {
    const r = await query<{ id: string }>(
      "SELECT id FROM loops WHERE id = $1 AND status = 'active' LIMIT 1",
      [toId]
    ).catch(() => ({ rows: [] }));
    return r.rows[0]?.id ?? null;
  }
  const toTag = (payload as { toLoopTag?: string; to?: string }).toLoopTag ?? (payload as { to?: string }).to;
  if (toTag) {
    const tag = String(toTag).replace(/^@/, "").trim().toLowerCase();
    const r = await query<{ id: string }>(
      "SELECT id FROM loops WHERE lower(loop_tag) = $1 AND status = 'active' LIMIT 1",
      [tag]
    ).catch(() => ({ rows: [] }));
    return r.rows[0]?.id ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const sender = await getProtocolSender(req);
  if (!sender) {
    return NextResponse.json(
      { error: "Unauthorized. Use session cookie or Authorization: Bearer lk_live_..." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const msg = body as Record<string, unknown>;
  const type = msg?.type as string;
  if (!type || !isValidMessageType(type)) {
    return NextResponse.json(
      { error: "Invalid or missing type. Use one of: " + VALID_TYPES.join(", ") },
      { status: 400 }
    );
  }

  const correlationId =
    (msg.correlationId as string) ||
    `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const toAgentId = await resolveToAgentId(msg as unknown as AgentProtocolMessage);

  // Channel for persistent memory (universal key: loop_id + agent_id + channel)
  const channel =
    (req.headers.get("x-openloop-channel") as string)?.trim() ||
    (msg.channel as string)?.trim() ||
    "sdk";

  // Ensure protocol_task_events table exists and insert event
  const payload = { ...msg, correlationId };
  let eventId: string;
  let memorySnapshot: Record<string, unknown> | undefined;
  let memoryVersion: number | undefined;
  let createdContractId: string | undefined;
  try {
    const insert = await query<{ id: string }>(
      `INSERT INTO protocol_task_events (event_type, from_agent_id, to_agent_id, contract_id, correlation_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        type,
        sender.loopId,
        toAgentId,
        (msg.contractId as string) || null,
        correlationId,
        JSON.stringify(payload),
      ]
    );
    eventId = insert.rows[0]?.id ?? "";
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[protocol/send] insert event", e);
    return NextResponse.json(
      { error: "Protocol event storage unavailable. Run migrations." },
      { status: 503 }
    );
  }

  // Persistent memory: merge this message into state (loop_id + agent_id + channel)
  const explicitMemory = msg.memory as Record<string, unknown> | undefined;
  const incomingContext: Record<string, unknown> = {
    last_event_type: type,
    last_correlation_id: correlationId,
    last_updated_at: new Date().toISOString(),
    ...(msg.task ? { last_task: msg.task } : {}),
    ...(msg.inputs && typeof msg.inputs === "object" ? { last_inputs: msg.inputs } : {}),
    ...(msg.contractId ? { last_contract_id: msg.contractId } : {}),
    ...(explicitMemory && typeof explicitMemory === "object" ? explicitMemory : {}),
  };
  const updated = await updatePersistentMemory(
    sender.loopId,
    toAgentId,
    channel,
    incomingContext,
    true
  );
  if (updated) {
    memorySnapshot = updated.memory;
    memoryVersion = updated.version;
  }

  // Route: TASK_REQUEST → create contract (if to + task + reward) and/or inbox message
  if (type === PROTOCOL_MESSAGE_TYPES.TASK_REQUEST && toAgentId) {
    const task = (msg.task as string) || "task";
    const inputs = (msg.inputs as Record<string, unknown>) || {};
    const rewardAmountCents = Math.max(
      0,
      parseInt(String((msg as { rewardAmountCents?: number }).rewardAmountCents ?? msg.budget ?? 0), 10) || 0
    );
    try {
      const contract = await query<{ id: string }>(
        `INSERT INTO loop_contracts (buyer_loop_id, seller_loop_id, task, inputs, reward_amount_cents, status)
         VALUES ($1, $2, $3, $4, $5, 'requested')
         RETURNING id`,
        [sender.loopId, toAgentId, task.slice(0, 1024), JSON.stringify(inputs), rewardAmountCents]
      );
      const cId = contract.rows[0]?.id;
      if (cId) {
        createdContractId = cId;
        await query(
          `UPDATE protocol_task_events SET contract_id = $1 WHERE id = $2`,
          [cId, eventId]
        ).catch(() => {});
        // Notify target via inbox
        await query(
          `INSERT INTO loop_messages (from_loop_id, to_loop_id, content, message_type, contract_id)
           VALUES ($1, $2, $3, 'negotiation', $4)`,
          [
            sender.loopId,
            toAgentId,
            `TASK_REQUEST: ${task} (correlation: ${correlationId})`,
            cId,
          ]
        ).catch(() => {});
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn("[protocol/send] contract create", e);
    }
  }

  // Optional: notify target via webhook if they have webhook_url
  if (toAgentId) {
    const webhookRes = await query<{ webhook_url: string | null }>(
      "SELECT webhook_url FROM loops WHERE id = $1 AND webhook_url IS NOT NULL AND webhook_url != '' LIMIT 1",
      [toAgentId]
    ).catch(() => ({ rows: [] }));
    const webhookUrl = webhookRes.rows[0]?.webhook_url;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: type,
          eventId,
          correlationId,
          fromAgentId: sender.loopId,
          toAgentId,
          payload,
        }),
      }).catch(() => {});
    }
  }

  // Reputation: TASK_COMPLETE and PAYMENT_CONFIRM feed into trust score
  if (type === PROTOCOL_MESSAGE_TYPES.TASK_COMPLETE || type === PROTOCOL_MESSAGE_TYPES.PAYMENT_CONFIRM) {
    const contractId = (msg.contractId as string) || (msg as { referenceId?: string }).referenceId;
    const loopIdsToBump = [sender.loopId];
    if (toAgentId) loopIdsToBump.push(toAgentId);
    if (contractId) {
      const contractRes = await query<{ buyer_loop_id: string; seller_loop_id: string }>(
        "SELECT buyer_loop_id, seller_loop_id FROM loop_contracts WHERE id = $1",
        [contractId]
      ).catch(() => ({ rows: [] }));
      const c = contractRes.rows[0];
      if (c) {
        loopIdsToBump.push(c.buyer_loop_id, c.seller_loop_id);
      }
    }
    const uniqueIds = Array.from(new Set(loopIdsToBump));
    for (const lid of uniqueIds) {
      query(
        "UPDATE loops SET trust_score = LEAST(100, COALESCE(trust_score, 50) + 2), updated_at = now() WHERE id = $1",
        [lid]
      ).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    eventId,
    correlationId,
    type,
    fromAgentId: sender.loopId,
    toAgentId: toAgentId ?? undefined,
    ...(createdContractId && { contractId: createdContractId }),
    ...(memorySnapshot !== undefined && { memory: memorySnapshot, memoryVersion }),
  });
}
