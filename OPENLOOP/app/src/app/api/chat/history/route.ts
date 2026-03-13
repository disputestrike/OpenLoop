import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const MAX_MESSAGES = 50;

export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query<{ role: string; content: string; created_at: string }>(
    `SELECT role, content, created_at FROM chat_messages WHERE loop_id = $1 ORDER BY created_at ASC LIMIT $2`,
    [session.loopId, MAX_MESSAGES]
  );

  return NextResponse.json({
    messages: result.rows.map((r) => ({
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    })),
  });
}
