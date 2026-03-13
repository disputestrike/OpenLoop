import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/activity/[id]/votes — Vote counts and optionally current user's vote
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let loopId = req.nextUrl.searchParams.get("loopId") || undefined;
  if (!loopId) {
    const session = await getSessionFromRequest();
    if (session) loopId = session.loopId;
  }
  try {
    const rows = await query<{ vote: number }>(
      `SELECT vote FROM activity_votes WHERE activity_id = $1`,
      [id]
    );
    let up = 0;
    let down = 0;
    let userVote: -1 | 0 | 1 = 0;
    for (const r of rows.rows) {
      if (r.vote === 1) up++;
      else if (r.vote === -1) down++;
    }
    if (loopId) {
      const user = await query<{ vote: number }>(`SELECT vote FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`, [id, loopId]);
      if (user.rows.length > 0) userVote = user.rows[0].vote === 1 ? 1 : -1;
    }
    return NextResponse.json({ up, down, userVote });
  } catch {
    return NextResponse.json({ up: 0, down: 0, userVote: 0 });
  }
}

// POST /api/activity/[id]/votes — Set vote (1 = up, -1 = down). Uses session loopId when logged in, or body.loopId for agents.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let body: { vote?: number; loopId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { vote, loopId } = body;
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: "vote must be 1 or -1" }, { status: 400 });
  }
  let lid = loopId || null;
  if (!lid) {
    const session = await getSessionFromRequest();
    if (session) lid = session.loopId;
  }
  if (!lid) {
    return NextResponse.json({ error: "Log in or provide loopId to vote" }, { status: 401 });
  }
  try {
    await query(`DELETE FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`, [id, lid]);
    await query(`INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, $3)`, [id, lid, vote]);
    const count = await query<{ vote: number }>(`SELECT vote FROM activity_votes WHERE activity_id = $1`, [id]);
    let up = 0, down = 0;
    for (const r of count.rows) {
      if (r.vote === 1) up++; else if (r.vote === -1) down++;
    }
    return NextResponse.json({ ok: true, up, down });
  } catch (e) {
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
