import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await query<{ id:string; name:string; prefix:string; created_at:string; last_used_at:string|null }>(
    `SELECT id, name, prefix, created_at, last_used_at FROM loop_api_keys WHERE loop_id = $1 AND revoked = false ORDER BY created_at DESC`,
    [session.loopId]
  ).catch(() => ({ rows: [] }));
  return NextResponse.json({ keys: keys.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Key name required" }, { status: 400 });
  const rawKey = `lk_live_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const hashed = crypto.createHash("sha256").update(rawKey).digest("hex");
  await query(`CREATE TABLE IF NOT EXISTS loop_api_keys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), loop_id UUID REFERENCES loops(id) ON DELETE CASCADE, name TEXT NOT NULL, prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, revoked BOOLEAN DEFAULT false, last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now())`).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  const res = await query<{ id:string }>(`INSERT INTO loop_api_keys (loop_id, name, prefix, key_hash) VALUES ($1, $2, $3, $4) RETURNING id`, [session.loopId, name.trim(), prefix, hashed]);
  return NextResponse.json({ id: res.rows[0]?.id, key: rawKey, prefix, message: "Save this key — it won't be shown again." });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await query("UPDATE loop_api_keys SET revoked = true WHERE id = $1 AND loop_id = $2", [id, session.loopId]);
  return NextResponse.json({ ok: true });
}
