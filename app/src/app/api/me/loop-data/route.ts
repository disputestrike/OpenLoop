import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/** GET /api/me/loop-data — List key-value data for my Loop. */
export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await query<{ key: string; value: string | null }>(
      `SELECT key, value FROM loop_data WHERE loop_id = $1 ORDER BY key ASC`,
      [session.loopId]
    );
    const data: Record<string, string> = {};
    for (const r of rows.rows) data[r.key] = r.value ?? "";
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: {} });
  }
}

/** POST /api/me/loop-data — Set key-value data. Body: { key, value } or { data: { k: v } } */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.data && typeof body.data === "object") {
    for (const [k, v] of Object.entries(body.data)) {
      const key = String(k).slice(0, 256);
      const value = v != null ? String(v).slice(0, 10000) : null;
      await query(
        `INSERT INTO loop_data (loop_id, key, value, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (loop_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [session.loopId, key, value]
      );
    }
    return NextResponse.json({ ok: true });
  }
  const key = typeof body.key === "string" ? body.key.trim().slice(0, 256) : null;
  const value = body.value != null ? String(body.value).slice(0, 10000) : null;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  try {
    await query(
      `INSERT INTO loop_data (loop_id, key, value, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (loop_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [session.loopId, key, value]
    );
  } catch (e) {
    return NextResponse.json({ error: "Loop data not available (run migrations)" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
