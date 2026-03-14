import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/me/inbox — get Loop messages (incoming + outgoing)
export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [inbox, outbox, unreadCount] = await Promise.all([
    query<{
      id: string; from_loop_id: string; from_tag: string;
      content: string; message_type: string; read_at: string | null; created_at: string;
    }>(
      `SELECT m.id, m.from_loop_id, l.loop_tag as from_tag,
              m.content, m.message_type, m.read_at, m.created_at
       FROM loop_messages m
       JOIN loops l ON l.id = m.from_loop_id
       WHERE m.to_loop_id = $1
       ORDER BY m.created_at DESC LIMIT 20`,
      [session.loopId]
    ).catch(() => ({ rows: [] })),

    query<{
      id: string; to_loop_id: string; to_tag: string;
      content: string; message_type: string; created_at: string;
    }>(
      `SELECT m.id, m.to_loop_id, l.loop_tag as to_tag,
              m.content, m.message_type, m.created_at
       FROM loop_messages m
       JOIN loops l ON l.id = m.to_loop_id
       WHERE m.from_loop_id = $1
       ORDER BY m.created_at DESC LIMIT 20`,
      [session.loopId]
    ).catch(() => ({ rows: [] })),

    query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM loop_messages WHERE to_loop_id = $1 AND read_at IS NULL",
      [session.loopId]
    ).catch(() => ({ rows: [{ count: "0" }] })),
  ]);

  return NextResponse.json({
    inbox: inbox.rows,
    outbox: outbox.rows,
    unreadCount: parseInt(unreadCount.rows[0]?.count || "0"),
  });
}

// POST /api/me/inbox — send a Loop-to-Loop message
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toLoopTag, content, messageType = "general", contractId } = await req.json();

  if (!toLoopTag?.trim()) return NextResponse.json({ error: "toLoopTag required" }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

  // Find target Loop
  const targetRes = await query<{ id: string; loop_tag: string; email: string | null; phone_number: string | null }>(
    "SELECT id, loop_tag, email, phone_number FROM loops WHERE loop_tag = $1 AND status = 'active' LIMIT 1",
    [toLoopTag.replace(/^@/, "")]
  );
  const target = targetRes.rows[0];
  if (!target) return NextResponse.json({ error: `@${toLoopTag} not found or not active` }, { status: 404 });

  // Save message (loop_messages may not exist if migration 015 not run)
  let msgRes: { rows: { id: string }[] };
  try {
    msgRes = await query<{ id: string }>(
      `INSERT INTO loop_messages (from_loop_id, to_loop_id, content, message_type, contract_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [session.loopId, target.id, content.trim(), messageType, contractId || null]
    );
  } catch {
    return NextResponse.json({ error: "Inbox is not available yet. Run database migrations." }, { status: 503 });
  }

  // Notify recipient
  const senderRes = await query<{ loop_tag: string; email: string | null }>(
    "SELECT loop_tag, email FROM loops JOIN humans ON loops.human_id = humans.id WHERE loops.id = $1",
    [session.loopId]
  ).catch(() => ({ rows: [] }));
  const sender = senderRes.rows[0];

  if (target.email || target.phone_number) {
    const { notifyLoopMessage } = await import("@/lib/notifications");
    await notifyLoopMessage({
      email: target.email,
      toLoopTag: target.loop_tag,
      fromLoopTag: sender?.loop_tag || "A Loop",
      preview: content.trim().slice(0, 100),
    }).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  }

  return NextResponse.json({ ok: true, messageId: msgRes.rows[0]?.id });
}

// PATCH /api/me/inbox — mark messages as read
export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { messageIds } = await req.json();
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      await query("UPDATE loop_messages SET read_at = now() WHERE to_loop_id = $1 AND read_at IS NULL", [session.loopId]);
    } else {
      await query(
        "UPDATE loop_messages SET read_at = now() WHERE id = ANY($1::uuid[]) AND to_loop_id = $2",
        [messageIds, session.loopId]
      );
    }
  } catch {
    return NextResponse.json({ error: "Inbox not available." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
