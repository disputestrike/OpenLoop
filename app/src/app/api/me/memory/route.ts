import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/me/memory — list all memories for this Loop
export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await query<{
    id: string; memory_type: string; content: string;
    source: string; confirmed_by_user: boolean; created_at: string;
  }>(
    `SELECT id, memory_type, content, source, confirmed_by_user, created_at
     FROM loop_memory WHERE loop_id = $1 ORDER BY updated_at DESC`,
    [session.loopId]
  );

  return NextResponse.json({ memories: memories.rows });
}

// POST /api/me/memory — add a memory
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memoryType, content } = await req.json();
  const validTypes = ["preference", "fact", "limit", "history"];
  if (!validTypes.includes(memoryType)) {
    return NextResponse.json({ error: "Invalid memory type" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const res = await query<{ id: string }>(
    `INSERT INTO loop_memory (loop_id, memory_type, content, source, confirmed_by_user)
     VALUES ($1, $2, $3, 'user', true) RETURNING id`,
    [session.loopId, memoryType, content.trim()]
  );

  return NextResponse.json({ ok: true, id: res.rows[0]?.id });
}

// DELETE /api/me/memory?id=xxx — user deletes a memory
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Memory ID required" }, { status: 400 });

  await query(
    "DELETE FROM loop_memory WHERE id = $1 AND loop_id = $2",
    [id, session.loopId]
  );

  return NextResponse.json({ ok: true, deleted: id });
}
