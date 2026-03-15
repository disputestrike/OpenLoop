import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "openloop-session";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "899774775993-smp583hfh7ja2t0npvjhee004oeno81p.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/**
 * GET /api/auth/google-redirect
 * Google OAuth callback — exchanges code for tokens, creates session
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state") || ""; // loopTag
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(new URL("/claim?error=google_denied", req.url));
    }

    const origin = req.nextUrl.origin;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google-redirect`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[google-redirect] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/claim?error=token_failed", req.url));
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(new URL("/claim?error=no_id_token", req.url));
    }

    // Decode ID token JWT
    const parts = idToken.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const { email, sub, name } = payload;

    if (!email) {
      return NextResponse.redirect(new URL("/claim?error=no_email", req.url));
    }

    // Ensure tables
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

    if (!loopId && state) {
      // Claim specific loop
      const existing = await query<{ id: string; human_id: string | null }>(`SELECT id, human_id FROM loops WHERE loop_tag = $1`, [state]).catch(() => ({ rows: [] as any[] }));
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

    if (!loopId) {
      return NextResponse.redirect(new URL("/claim?error=loop_failed", req.url));
    }

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    await query(`INSERT INTO loop_sessions (loop_id, human_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')`, [loopId, humanId, token]);

    // Set cookie and redirect to dashboard
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("[google-redirect]", error);
    return NextResponse.redirect(new URL("/claim?error=server_error", req.url));
  }
}
