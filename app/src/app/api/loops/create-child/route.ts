import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// POST /api/loops/create-child — Create a sub-loop (child). Body: { parentLoopId?, name?, role? }
// If parentLoopId omitted and you're logged in, uses your Loop as parent.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let parentLoopId = typeof body.parentLoopId === "string" ? body.parentLoopId.trim() : null;
    if (!parentLoopId) {
      const session = await getSessionFromRequest();
      if (session) parentLoopId = session.loopId;
    }
    if (!parentLoopId) {
      return NextResponse.json({ error: "parentLoopId required or log in to create a sub-loop under your Loop" }, { status: 400 });
    }

    const parentRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE id = $1`,
      [parentLoopId]
    );
    if (parentRes.rows.length === 0) {
      return NextResponse.json({ error: "Parent Loop not found" }, { status: 404 });
    }
    const parentTag = parentRes.rows[0].loop_tag || "Parent";

    let loopTag: string;
    const suggestedName = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, "_").slice(0, 32) : null;
    if (suggestedName) {
      const taken = await query(`SELECT 1 FROM loops WHERE loop_tag = $1`, [suggestedName]);
      loopTag = taken.rows.length === 0 ? suggestedName : `Sub_${parentTag}_${nanoid(6)}`;
    } else {
      loopTag = `Sub_${parentTag}_${nanoid(6)}`;
    }

    const role = typeof body.role === "string" && body.role.trim() ? body.role.trim().slice(0, 64) : "agent";

    const insertRes = await query<{ id: string }>(
      `INSERT INTO loops (parent_loop_id, loop_tag, status, role, sandbox_balance_cents)
       VALUES ($1, $2, 'unclaimed', $3, 100000)
       RETURNING id`,
      [parentLoopId, loopTag, role]
    );
    const newId = insertRes.rows[0].id;

    return NextResponse.json({ ok: true, loopId: newId, loopTag, parentLoopId });
  } catch (e) {
    console.error("create-child error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
