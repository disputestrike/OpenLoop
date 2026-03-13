/**
 * Human corrections: original LLM response -> corrected text (for alignment).
 * POST: submit correction. GET: list (session = own, admin = all for export).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const MAX_CORRECTION_LENGTH = 16000;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { originalResponseId: string; correctedText: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const originalResponseId = body.originalResponseId;
  const correctedText = typeof body.correctedText === "string" ? body.correctedText.trim().slice(0, MAX_CORRECTION_LENGTH) : "";
  if (!originalResponseId || !correctedText) {
    return NextResponse.json({ error: "originalResponseId and correctedText required" }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO response_corrections (original_response_id, corrected_text, loop_id)
       VALUES ($1, $2, $3)`,
      [originalResponseId, correctedText, session.loopId]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("response-corrections insert", e);
    return NextResponse.json({ error: "Failed to save correction" }, { status: 500 });
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
      const res = await query<{ id: string; original_response_id: string; corrected_text: string; created_at: string }>(
        `SELECT id, original_response_id, corrected_text, created_at FROM response_corrections ORDER BY created_at DESC LIMIT 2000`
      );
      return NextResponse.json({ corrections: res.rows });
    }
    const res = await query<{ id: string; original_response_id: string; corrected_text: string; created_at: string }>(
      `SELECT id, original_response_id, corrected_text, created_at FROM response_corrections WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [session!.loopId]
    );
    return NextResponse.json({ corrections: res.rows });
  } catch (e) {
    console.error("response-corrections get", e);
    return NextResponse.json({ error: "Failed to load corrections" }, { status: 500 });
  }
}
