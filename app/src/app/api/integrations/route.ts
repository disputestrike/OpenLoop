import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * GET    /api/integrations  - list integrations
 * POST   /api/integrations  - add integration webhook
 * PATCH  /api/integrations?id=xxx - toggle active
 * DELETE /api/integrations?id=xxx - remove integration
 * 
 * Connects Loop events to n8n (self-hosted), Zapier, Make, or any webhook.
 * n8n is recommended: free, self-hosted on Railway, 400+ integrations.
 */

const AVAILABLE_EVENTS = [
  { id: "deal_completed", label: "Deal completed", desc: "Loop-to-Loop deal reached" },
  { id: "win_recorded", label: "Win recorded", desc: "Savings verified to wallet" },
  { id: "order_placed", label: "Order placed", desc: "Agent placed a real-world order" },
  { id: "order_approved", label: "Order approved", desc: "Human approved a pending order" },
  { id: "trust_milestone", label: "Trust milestone", desc: "Trust score hit 25/50/75/90/96%" },
  { id: "browser_action", label: "Browser action", desc: "Loop browsed a website" },
  { id: "message_received", label: "Message received", desc: "Another Loop sent a message" },
  { id: "negotiation_started", label: "Negotiation started", desc: "Loop started a negotiation" },
  { id: "contract_completed", label: "Contract completed", desc: "Loop contract verified and paid" },
  { id: "post_created", label: "Post created", desc: "Loop posted to the feed" },
];

export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await query<{
    id: string; integration_name: string; webhook_url: string;
    trigger_events: string[]; active: boolean; last_triggered_at: string | null; trigger_count: number; created_at: string;
  }>(
    "SELECT id, integration_name, webhook_url, trigger_events, active, last_triggered_at, trigger_count, created_at FROM loop_integrations WHERE loop_id = $1 ORDER BY created_at DESC",
    [session.loopId]
  ).catch(() => ({ rows: [] }));

  return NextResponse.json({ integrations: integrations.rows, availableEvents: AVAILABLE_EVENTS });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { integrationName, webhookUrl, triggerEvents, headers } = await req.json().catch(() => ({}));

  if (!integrationName?.trim()) return NextResponse.json({ error: "integrationName required" }, { status: 400 });
  if (!webhookUrl?.trim()) return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
  if (!Array.isArray(triggerEvents) || triggerEvents.length === 0) {
    return NextResponse.json({ error: "triggerEvents required (array)" }, { status: 400 });
  }

  // Test the webhook first
  let testPassed = false;
  try {
    const testRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-OpenLoop-Event": "test", ...(headers || {}) },
      body: JSON.stringify({ event: "test", message: "OpenLoop webhook test", timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    testPassed = testRes.ok || testRes.status < 500;
  } catch {
    testPassed = false;
  }

  const res = await query<{ id: string }>(
    `INSERT INTO loop_integrations (loop_id, integration_name, webhook_url, trigger_events, headers)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [session.loopId, integrationName.trim(), webhookUrl.trim(), triggerEvents, JSON.stringify(headers || {})]
  ).catch((e) => {
    console.error("[integrations] POST", e);
    return null;
  });

  if (!res?.rows?.[0]) {
    return NextResponse.json(
      { error: "Integrations not available. Run db:migrate to create loop_integrations table." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    integrationId: res.rows[0].id,
    testPassed,
    message: testPassed
      ? `✅ ${integrationName} connected! Webhook test succeeded.`
      : `⚠️ ${integrationName} saved, but webhook test failed. Check the URL and try again.`,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { active } = await req.json().catch(() => ({}));

  await query(
    "UPDATE loop_integrations SET active = $1 WHERE id = $2 AND loop_id = $3",
    [Boolean(active), id, session.loopId]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await query("DELETE FROM loop_integrations WHERE id = $1 AND loop_id = $2", [id, session.loopId]).catch(() => null);

  return NextResponse.json({ ok: true });
}
