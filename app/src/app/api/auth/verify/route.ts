import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "openloop-session";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";

/**
 * GET /api/auth/verify?token=xxx
 * Validates magic link token, creates session, redirects to dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.redirect(`${APP_URL}/claim?error=no_token`);

    // Find and validate token
    const linkRes = await query<{ email: string; loop_tag: string | null; used: boolean; expires_at: string }>(
      `SELECT email, loop_tag, used, expires_at FROM magic_links WHERE token = $1`,
      [token]
    ).catch(() => ({ rows: [] as any[] }));

    const link = linkRes.rows[0];
    if (!link) return NextResponse.redirect(`${APP_URL}/claim?error=invalid_token`);
    if (link.used) return NextResponse.redirect(`${APP_URL}/claim?error=token_used`);
    if (new Date(link.expires_at) < new Date()) return NextResponse.redirect(`${APP_URL}/claim?error=token_expired`);

    // Mark as used
    await query(`UPDATE magic_links SET used = true WHERE token = $1`, [token]);

    const email = link.email;

    // Ensure tables
    await query(`CREATE TABLE IF NOT EXISTS loop_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), loop_id UUID NOT NULL, human_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days', created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(() => {});

    // Find or create human
    let humanId: string;
    const existingHuman = await query<{ id: string }>(`SELECT id FROM humans WHERE email = $1`, [email]).catch(() => ({ rows: [] as any[] }));
    if (existingHuman.rows[0]) {
      humanId = existingHuman.rows[0].id;
    } else {
      humanId = crypto.randomUUID();
      await query(`INSERT INTO humans (id, email, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (email) DO NOTHING`, [humanId, email]);
      const refetch = await query<{ id: string }>(`SELECT id FROM humans WHERE email = $1`, [email]).catch(() => ({ rows: [] as any[] }));
      if (refetch.rows[0]) humanId = refetch.rows[0].id;
    }

    // Find or create loop
    let loopId: string | undefined;
    const existingLoop = await query<{ id: string }>(`SELECT id FROM loops WHERE human_id = $1 LIMIT 1`, [humanId]).catch(() => ({ rows: [] as any[] }));
    loopId = existingLoop.rows[0]?.id;

    if (!loopId && link.loop_tag) {
      const claimable = await query<{ id: string; human_id: string | null }>(`SELECT id, human_id FROM loops WHERE loop_tag = $1`, [link.loop_tag]).catch(() => ({ rows: [] as any[] }));
      if (claimable.rows[0] && !claimable.rows[0].human_id) {
        loopId = claimable.rows[0].id;
        await query(`UPDATE loops SET human_id = $1, status = 'active', claimed_at = NOW() WHERE id = $2`, [humanId, loopId]).catch(() => {});
      }
    }

    if (!loopId) {
      const tag = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) + "_" + crypto.randomBytes(2).toString("hex");
      try {
        const newLoop = await query<{ id: string }>(
          `INSERT INTO loops (loop_tag, human_id, status, role, trust_score) VALUES ($1, $2, 'active', 'personal', 50) RETURNING id`,
          [tag, humanId]
        );
        loopId = newLoop.rows[0]?.id;
      } catch {
        const fallback = await query<{ id: string }>(
          `INSERT INTO loops (human_id, status, role, trust_score) VALUES ($1, 'active', 'personal', 50) RETURNING id`,
          [humanId]
        ).catch(() => ({ rows: [] as any[] }));
        loopId = fallback.rows[0]?.id;
      }
    }

    if (!loopId) return NextResponse.redirect(`${APP_URL}/claim?error=loop_failed`);

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    await query(`INSERT INTO loop_sessions (loop_id, human_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')`, [loopId, humanId, sessionToken]);

    // Welcome credits
    await query(
      `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier) VALUES ($1, 'bonus', 1000, 0, 1000, 'Welcome bonus', 'sandbox')`,
      [loopId]
    ).catch(() => {});

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (error) {
    console.error("[verify]", error);
    return NextResponse.redirect(`${APP_URL}/claim?error=server_error`);
  }
}
