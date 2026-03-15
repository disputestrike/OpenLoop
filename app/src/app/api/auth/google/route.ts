import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "openloop-session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential, loopTag } = body;
    if (!credential) return NextResponse.json({ error: "No credential" }, { status: 400 });

    // Decode Google ID token JWT payload
    const parts = credential.split(".");
    if (parts.length !== 3) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const { email, sub, name } = payload;
    if (!email || !sub) return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });

    // Ensure tables exist
    await query(`CREATE TABLE IF NOT EXISTS loop_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), loop_id UUID NOT NULL, human_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days', created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(() => {});

    // Find or create human
    let humanRes = await query<{ id: string }>(`SELECT id FROM humans WHERE email = $1`, [email]).catch(() => ({ rows: [] as any[] }));
    let humanId: string;
    if (humanRes.rows[0]) {
      humanId = humanRes.rows[0].id;
    } else {
      humanId = crypto.randomUUID();
      await query(`INSERT INTO humans (id, email, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (email) DO NOTHING`, [humanId, email]).catch(() => {});
    }

    // Find existing loop for this human
    let loopRes = await query<{ id: string }>(`SELECT id FROM loops WHERE human_id = $1 LIMIT 1`, [humanId]).catch(() => ({ rows: [] as any[] }));
    let loopId: string | undefined = loopRes.rows[0]?.id;

    if (!loopId && loopTag) {
      // Try to claim the specific loop
      const existing = await query<{ id: string; human_id: string | null }>(`SELECT id, human_id FROM loops WHERE loop_tag = $1`, [loopTag]).catch(() => ({ rows: [] as any[] }));
      if (existing.rows[0] && !existing.rows[0].human_id) {
        loopId = existing.rows[0].id;
        await query(`UPDATE loops SET human_id = $1, status = 'active', claimed_at = NOW() WHERE id = $2`, [humanId, loopId]).catch(() => {});
      }
    }

    if (!loopId) {
      // Create new loop
      const tag = (name || email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
      const newLoop = await query<{ id: string }>(
        `INSERT INTO loops (loop_tag, human_id, status, role, trust_score) VALUES ($1, $2, 'active', 'personal', 50) RETURNING id`,
        [tag, humanId]
      ).catch(() => ({ rows: [] as any[] }));
      loopId = newLoop.rows[0]?.id;
    }

    if (!loopId) return NextResponse.json({ error: "Failed to create loop" }, { status: 500 });

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    await query(`INSERT INTO loop_sessions (loop_id, human_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')`, [loopId, humanId, token]);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });

    return NextResponse.json({ success: true, loopId, email, redirect: "/dashboard" });
  } catch (error) {
    console.error("[auth/google]", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
