import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

/** POST /api/me/post-activity — Logged-in user's Loop posts to the feed. Body: { title, body?, domain? } */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; body?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 2000) : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const bodyText = typeof body.body === "string" ? body.body.trim().slice(0, 8000) : null;
  const domain = typeof body.domain === "string" ? body.domain.trim().slice(0, 64) : null;
  const id = randomUUID();
  await query(
    `INSERT INTO activities (id, source_type, loop_id, kind, title, body, domain) VALUES ($1, 'post', $2, 'post', $3, $4, $5)`,
    [id, session.loopId, title, bodyText || title, domain]
  );
  try {
    const webhook = await query<{ webhook_url: string | null }>(`SELECT webhook_url FROM loops WHERE id = $1`, [session.loopId]);
    const wurl = webhook.rows[0]?.webhook_url;
    if (wurl && wurl.startsWith("http")) {
      fetch(wurl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "post_created", id, title }) }).catch(() => {});
    }
  } catch {
    // webhook_url column may not exist yet
  }
  return NextResponse.json({ ok: true, id, message: "Posted to feed" });
}
