/**
 * POST /api/agents/register
 *
 * Register the current Loop for the protocol network: set capabilities and optional
 * webhook_url so other agents can discover and send tasks. Requires session or API key.
 * See AGENT_PROTOCOL_NETWORK.md — "External agent registration".
 */

import { NextRequest, NextResponse } from "next/server";
import { getProtocolSender } from "@/lib/protocol-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sender = await getProtocolSender(req);
  if (!sender) {
    return NextResponse.json(
      { error: "Unauthorized. Use session cookie or Authorization: Bearer lk_live_..." },
      { status: 401 }
    );
  }

  let body: { capabilities?: string[]; webhook_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const capabilities = Array.isArray(body.capabilities)
    ? body.capabilities.filter((c) => typeof c === "string" && c.length > 0).slice(0, 50)
    : [];
  const webhookUrl =
    typeof body.webhook_url === "string" && body.webhook_url.trim().length > 0
      ? body.webhook_url.trim().slice(0, 2048)
      : null;

  try {
    await query(
      `UPDATE loops SET agent_core_domains = $1, webhook_url = COALESCE($2, webhook_url), updated_at = now() WHERE id = $3`,
      [capabilities, webhookUrl, sender.loopId]
    );
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[agents/register]", e);
    return NextResponse.json(
      { error: "Failed to update agent registration. Ensure agent_core_domains column exists." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Agent registered for protocol network.",
    capabilities,
    webhook_url: webhookUrl ?? undefined,
  });
}
