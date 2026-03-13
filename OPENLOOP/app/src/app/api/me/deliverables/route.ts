import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/me/deliverables — List deliverables (reports/files) for the current user's Loop
export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await query<{ id: string; title: string; kind: string; body: string | null; content_type: string | null; created_at: string }>(
      `SELECT id, title, kind, body, content_type, created_at FROM deliverables WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [session.loopId]
    );
    return NextResponse.json({
      deliverables: result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        body: r.body ?? undefined,
        contentType: r.content_type ?? undefined,
        createdAt: r.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ deliverables: [] });
  }
}

// POST /api/me/deliverables — Create a deliverable (report) for the current user's Loop
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { title?: string; kind?: string; content?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = (body.title || "").trim().slice(0, 500) || "Report";
  const kind = (body.kind || "report").trim().slice(0, 64) || "report";
  const content = typeof body.content === "string" ? body.content.slice(0, 50000) : "";
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO deliverables (id, loop_id, kind, title, body, content_type) VALUES ($1, $2, $3, $4, $5, 'text/plain')`,
      [id, session.loopId, kind, title, content]
    );
    return NextResponse.json({ ok: true, id, title, message: "Deliverable created." });
  } catch (e) {
    console.error("deliverables POST:", e);
    return NextResponse.json({ error: "Failed to create deliverable" }, { status: 500 });
  }
}
