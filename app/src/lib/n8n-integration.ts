/**
 * OpenLoop n8n Integration Bridge
 * 
 * Connects OpenLoop events to n8n webhooks, which in turn connect to
 * 400+ apps: Gmail, Slack, Notion, Airtable, Google Sheets, Salesforce,
 * HubSpot, Calendly, Trello, Jira, Discord, Telegram, and everything else.
 * 
 * Deploy n8n on Railway alongside OpenLoop (free, self-hosted).
 * Each Loop can have its own webhook destinations.
 * 
 * Events fired:
 * - deal_completed: Loop-to-Loop deal reached
 * - win_recorded: savings verified to wallet
 * - order_placed: agent placed a real-world order
 * - order_approved: human approved a pending order
 * - trust_milestone: trust score hit a milestone
 * - browser_action: Loop browsed and extracted data
 * - message_received: another Loop sent a message
 * - negotiation_started: Loop initiated a negotiation
 */

import { query } from "./db";

export type IntegrationEvent =
  | "deal_completed"
  | "win_recorded"
  | "order_placed"
  | "order_approved"
  | "trust_milestone"
  | "browser_action"
  | "message_received"
  | "negotiation_started"
  | "loop_message"
  | "contract_completed"
  | "post_created";

export interface IntegrationPayload {
  event: IntegrationEvent;
  loopId: string;
  loopTag: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── Fire event to all matching integrations ───────────────────────────────
export async function fireIntegrationEvent(params: {
  loopId: string;
  loopTag: string;
  event: IntegrationEvent;
  data: Record<string, unknown>;
}): Promise<void> {
  const { loopId, loopTag, event, data } = params;

  const integrations = await query<{
    id: string; webhook_url: string; headers: Record<string, string>;
  }>(
    `SELECT id, webhook_url, headers FROM loop_integrations
     WHERE loop_id = $1 AND active = true AND $2 = ANY(trigger_events)`,
    [loopId, event]
  ).catch(() => ({ rows: [] }));

  if (integrations.rows.length === 0) return;

  const payload: IntegrationPayload = {
    event,
    loopId,
    loopTag,
    timestamp: new Date().toISOString(),
    data,
  };

  // Fire all webhooks in parallel, don't block
  const fires = integrations.rows.map(async (integration) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-OpenLoop-Event": event,
        "X-OpenLoop-Loop": loopTag,
        ...(integration.headers || {}),
      };

      const res = await fetch(integration.webhook_url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      // Update trigger count and timestamp
      await query(
        "UPDATE loop_integrations SET last_triggered_at = now(), trigger_count = trigger_count + 1 WHERE id = $1",
        [integration.id]
      ).catch(() => {});

      if (!res.ok) {
        console.error(`[n8n] Webhook failed: ${integration.webhook_url} → ${res.status}`);
      }
    } catch (e) {
      console.error(`[n8n] Webhook error: ${integration.webhook_url}`, e);
    }
  });

  // Fire and forget — don't await, don't block the main flow
  Promise.allSettled(fires).catch(() => {});
}

// ── Common integration event helpers ─────────────────────────────────────
export function fireDealCompleted(loopId: string, loopTag: string, data: {
  businessLoopTag: string; subject: string; agreedValue: string; savingsCents?: number;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "deal_completed", data });
}

export function fireWinRecorded(loopId: string, loopTag: string, data: {
  description: string; amountSavedCents: number; verificationTier: string;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "win_recorded", data });
}

export function fireOrderPlaced(loopId: string, loopTag: string, data: {
  orderId: string; orderType: string; targetBusiness: string; description: string; amountCents?: number;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "order_placed", data });
}

export function fireTrustMilestone(loopId: string, loopTag: string, data: {
  newScore: number; previousScore: number;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "trust_milestone", data });
}

export function fireBrowserAction(loopId: string, loopTag: string, data: {
  targetBusiness: string; objective: string; outcome: string; savingsCents?: number;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "browser_action", data });
}

export function firePostCreated(loopId: string, loopTag: string, data: {
  activityId: string; title: string; body?: string; domain?: string;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "post_created", data });
}

export function fireOrderApproved(loopId: string, loopTag: string, data: {
  orderId: string; orderType: string; description: string;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "order_approved", data });
}

export function fireContractCompleted(loopId: string, loopTag: string, data: {
  contractId: string; status: string; amountCents?: number;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "contract_completed", data });
}

export function fireNegotiationStarted(loopId: string, loopTag: string, data: {
  subject?: string; targetLoopTag?: string; contractId?: string;
}) {
  return fireIntegrationEvent({ loopId, loopTag, event: "negotiation_started", data });
}
