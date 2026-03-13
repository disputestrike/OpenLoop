import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let loopResult: { rows: Array<{ id: string; loop_tag: string | null; trust_score: number; role: string; email: string | null; loop_email?: string | null; webhook_url?: string | null }> };
  try {
    loopResult = await query(
      `SELECT id, loop_tag, trust_score, role, email, loop_email, webhook_url FROM loops WHERE id = $1`,
      [session.loopId]
    );
  } catch {
    loopResult = await query(
      `SELECT id, loop_tag, trust_score, role, email FROM loops WHERE id = $1`,
      [session.loopId]
    );
  }

  if (loopResult.rows.length === 0) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const loop = loopResult.rows[0];
  return NextResponse.json({
    humanId: session.humanId,
    loop: {
      id: loop.id,
      loopTag: loop.loop_tag,
      trustScore: loop.trust_score,
      role: loop.role,
      email: loop.email,
      loopEmail: loop.loop_email ?? null,
      webhookUrl: loop.webhook_url ?? null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const loopEmail = typeof body.loopEmail === "string" ? body.loopEmail.trim().slice(0, 256) || null : undefined;
  const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim().slice(0, 2048) || null : undefined;
  if (loopEmail === undefined && webhookUrl === undefined) return NextResponse.json({ error: "No updates" }, { status: 400 });
  const updates: string[] = [];
  const values: (string | null)[] = [];
  let i = 1;
  if (loopEmail !== undefined) { updates.push(`loop_email = $${i}`); values.push(loopEmail); i++; }
  if (webhookUrl !== undefined) { updates.push(`webhook_url = $${i}`); values.push(webhookUrl); i++; }
  values.push(session.loopId);
  await query(`UPDATE loops SET ${updates.join(", ")} WHERE id = $${i}`, values);
  return NextResponse.json({ ok: true });
}
