import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET /api/me/schedules — List schedules for the current user's Loop
export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await query<{ id: string; cron_expr: string; next_run_at: string | null; last_run_at: string | null; created_at: string }>(
      `SELECT id, cron_expr, next_run_at, last_run_at, created_at FROM loop_schedules WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [session.loopId]
    );
    return NextResponse.json({
      schedules: result.rows.map((r) => ({
        id: r.id,
        cronExpr: r.cron_expr,
        nextRunAt: r.next_run_at ?? undefined,
        lastRunAt: r.last_run_at ?? undefined,
        createdAt: r.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ schedules: [] });
  }
}

// POST /api/me/schedules — Add a schedule (cadence) for the current user's Loop
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { cronExpr?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const cronExpr = (body.cronExpr || "").trim().slice(0, 128) || "0 9 * * 1-5";
  try {
    const id = randomUUID();
    await query(
      `INSERT INTO loop_schedules (id, loop_id, cron_expr) VALUES ($1, $2, $3)`,
      [id, session.loopId, cronExpr]
    );
    return NextResponse.json({ ok: true, id, cronExpr, message: "Schedule added. (Execution uses cron worker; next_run_at will be set when the worker runs.)" });
  } catch (e) {
    console.error("schedules POST:", e);
    return NextResponse.json({ error: "Failed to add schedule" }, { status: 500 });
  }
}
