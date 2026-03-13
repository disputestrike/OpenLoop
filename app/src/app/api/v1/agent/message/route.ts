/**
 * G3 AAP/1.0 — POST /api/v1/agent/message (Agent-to-Agent message).
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { target_loop_id: string; content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetLoopId = body?.target_loop_id;
  const content = typeof body?.content === "string" ? body.content.trim().slice(0, 4000) : "";
  if (!targetLoopId || !content) {
    return NextResponse.json({ error: "target_loop_id and content required" }, { status: 400 });
  }

  const id = `msg_${nanoid(16)}`;
  try {
    await query(
      `INSERT INTO activities (id, source_type, loop_id, kind, title, body)
       VALUES ($1, 'post', $2, 'chat', $3, $4)`,
      [id, session.loopId, `Message to ${targetLoopId}`, content]
    );
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[agent/message]", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
