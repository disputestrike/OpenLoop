/**
 * POST /api/flow/step — Canonical flow engine: load memory → merge input → next step → save.
 * Use from chat, protocol, or any channel for one productized state machine.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { runFlowStep } from "@/lib/flow-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { channel?: string; agentId?: string; message?: string; eventType?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel = body.channel?.trim() || "web";
  const agentId = body.agentId?.trim() || null;

  const result = await runFlowStep(session.loopId, agentId, channel, {
    message: body.message,
    eventType: body.eventType,
    payload: body.payload,
  });

  if (!result) return NextResponse.json({ error: "Flow engine unavailable" }, { status: 503 });

  return NextResponse.json({
    ok: true,
    memory: result.memory,
    version: result.version,
    nextStep: result.nextStep,
    responseText: result.responseText,
    yourLoopId: session.loopId,
  });
}
