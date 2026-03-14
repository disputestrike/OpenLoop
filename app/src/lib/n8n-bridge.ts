/**
 * OpenLoop n8n Integration Bridge
 *
 * n8n is self-hosted on Railway alongside OpenLoop.
 * This bridge lets any Loop trigger n8n workflows and receive results.
 *
 * Coverage: 400+ apps including Gmail, Slack, Salesforce, HubSpot,
 * Google Sheets, Notion, Airtable, Stripe, Shopify, and every major SaaS.
 *
 * Architecture:
 * - Loop sends intent → n8n receives via webhook → executes workflow → returns result
 * - Pre-built workflow templates for common tasks (bill payment, appointment, order)
 * - Custom workflows: business can upload their own n8n JSON
 */

import { query } from "./db";

const N8N_BASE_URL = process.env.N8N_BASE_URL || "http://localhost:5678";
const N8N_API_KEY = process.env.N8N_API_KEY || "";
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_URL || `${N8N_BASE_URL}/webhook`;

// ── Pre-built workflow IDs (seeded on n8n startup) ────────
export const WORKFLOW_TEMPLATES = {
  FIND_BILL_SAVINGS: "openloop-bill-savings",
  BOOK_APPOINTMENT: "openloop-book-appointment",
  COMPARE_PRICES: "openloop-compare-prices",
  SEND_EMAIL: "openloop-send-email",
  UPDATE_SPREADSHEET: "openloop-update-spreadsheet",
  CREATE_CALENDAR_EVENT: "openloop-calendar-event",
  SLACK_NOTIFICATION: "openloop-slack-notify",
  CRM_UPDATE: "openloop-crm-update",
  ECOMMERCE_ORDER: "openloop-place-order",
  CANCEL_SERVICE: "openloop-cancel-service",
} as const;

export type WorkflowTemplate = typeof WORKFLOW_TEMPLATES[keyof typeof WORKFLOW_TEMPLATES];

export interface N8nTriggerParams {
  loopId: string;
  loopTag: string;
  workflowId: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}

export interface N8nResult {
  success: boolean;
  workflowId: string;
  executionId?: string;
  output?: Record<string, unknown>;
  error?: string;
}

// ── Trigger an n8n workflow ────────────────────────────────
export async function triggerN8nWorkflow(params: N8nTriggerParams): Promise<N8nResult> {
  const { loopId, loopTag, workflowId, payload, timeoutMs = 30000 } = params;

  const webhookUrl = `${N8N_WEBHOOK_BASE}/${workflowId}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Loop-Id": loopId,
        "X-Loop-Tag": loopTag,
        "X-OpenLoop-Key": N8N_API_KEY,
      },
      body: JSON.stringify({
        loopId,
        loopTag,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, workflowId, error: `n8n webhook returned ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => ({})) as Record<string, unknown>;

    // Log the execution
    await query(
      `INSERT INTO loop_n8n_executions (loop_id, workflow_id, payload, result, status, created_at)
       VALUES ($1, $2, $3, $4, 'completed', now())`,
      [loopId, workflowId, JSON.stringify(payload), JSON.stringify(data)]
    ).catch(() => {});

    return { success: true, workflowId, executionId: String(data.executionId || ""), output: data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "n8n trigger failed";

    await query(
      `INSERT INTO loop_n8n_executions (loop_id, workflow_id, payload, result, status, created_at)
       VALUES ($1, $2, $3, $4, 'error', now())`,
      [loopId, workflowId, JSON.stringify(payload), JSON.stringify({ error: msg })]
    ).catch(() => {});

    return { success: false, workflowId, error: msg };
  }
}

// ── Check if n8n is running ────────────────────────────────
export async function checkN8nHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${N8N_BASE_URL}/healthz`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Get available workflows from n8n ─────────────────────
export async function listN8nWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>> {
  if (!N8N_API_KEY) return [];
  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: Array<{ id: string; name: string; active: boolean }> };
    return data.data || [];
  } catch {
    return [];
  }
}

// ── High-level Loop actions using n8n ──────────────────────

export async function sendEmailViaLoop(params: {
  loopId: string;
  loopTag: string;
  to: string;
  subject: string;
  body: string;
}): Promise<N8nResult> {
  return triggerN8nWorkflow({
    loopId: params.loopId,
    loopTag: params.loopTag,
    workflowId: WORKFLOW_TEMPLATES.SEND_EMAIL,
    payload: { to: params.to, subject: params.subject, body: params.body },
  });
}

export async function createCalendarEvent(params: {
  loopId: string;
  loopTag: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}): Promise<N8nResult> {
  return triggerN8nWorkflow({
    loopId: params.loopId,
    loopTag: params.loopTag,
    workflowId: WORKFLOW_TEMPLATES.CREATE_CALENDAR_EVENT,
    payload: { title: params.title, startTime: params.startTime, endTime: params.endTime, description: params.description },
  });
}

export async function findBillSavings(params: {
  loopId: string;
  loopTag: string;
  provider: string;
  currentAmountCents: number;
}): Promise<N8nResult> {
  return triggerN8nWorkflow({
    loopId: params.loopId,
    loopTag: params.loopTag,
    workflowId: WORKFLOW_TEMPLATES.FIND_BILL_SAVINGS,
    payload: { provider: params.provider, currentAmountCents: params.currentAmountCents },
  });
}

export async function placeOrderViaN8n(params: {
  loopId: string;
  loopTag: string;
  product: string;
  maxPriceCents: number;
  store?: string;
}): Promise<N8nResult> {
  return triggerN8nWorkflow({
    loopId: params.loopId,
    loopTag: params.loopTag,
    workflowId: WORKFLOW_TEMPLATES.ECOMMERCE_ORDER,
    payload: { product: params.product, maxPriceCents: params.maxPriceCents, store: params.store || "amazon" },
    timeoutMs: 60000, // Orders can take longer
  });
}
