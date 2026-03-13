/**
 * Response preferences (RLHF-style): thumbs up/down or chosen vs rejected.
 * POST: record preference. GET: list (session = own, admin = all for export).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { interactionId: string; rating?: "up" | "down"; chosenId?: string; rejectedId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const interactionId = body.interactionId ?? body.chosenId ?? body.rejectedId;
  if (!interactionId || typeof interactionId !== "string") {
    return NextResponse.json({ error: "interactionId (or chosenId/rejectedId) required" }, { status: 400 });
  }

  const rating = body.rating;
  const chosenId = body.chosenId;
  const rejectedId = body.rejectedId;

  let chosenResponseId: string | null = null;
  let rejectedResponseId: string | null = null;
  let promptId: string = interactionId;

  if (rating === "up") {
    chosenResponseId = interactionId;
  } else if (rating === "down") {
    rejectedResponseId = interactionId;
  } else if (chosenId || rejectedId) {
    chosenResponseId = chosenId ?? null;
    rejectedResponseId = rejectedId ?? null;
    promptId = chosenId ?? rejectedId ?? interactionId;
  } else {
    return NextResponse.json({ error: "Provide rating: 'up'|'down' or chosenId/rejectedId" }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO response_preferences (prompt_id, chosen_response_id, rejected_response_id, loop_id)
       VALUES ($1, $2, $3, $4)`,
      [promptId, chosenResponseId, rejectedResponseId, session.loopId]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("response-preferences insert", e);
    return NextResponse.json({ error: "Failed to save preference" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  const adminSecret = req.nextUrl.searchParams.get("admin_secret") ?? req.headers.get("x-admin-secret") ?? "";
  const isAdmin = !!process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET;

  if (!session && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (isAdmin) {
      const res = await query<{ id: string; prompt_id: string; chosen_response_id: string | null; rejected_response_id: string | null; created_at: string }>(
        `SELECT id, prompt_id, chosen_response_id, rejected_response_id, created_at FROM response_preferences ORDER BY created_at DESC LIMIT 5000`
      );
      return NextResponse.json({ preferences: res.rows });
    }
    const res = await query<{ id: string; prompt_id: string; chosen_response_id: string | null; rejected_response_id: string | null; created_at: string }>(
      `SELECT id, prompt_id, chosen_response_id, rejected_response_id, created_at FROM response_preferences WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [session!.loopId]
    );
    return NextResponse.json({ preferences: res.rows });
  } catch (e) {
    console.error("response-preferences get", e);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}
