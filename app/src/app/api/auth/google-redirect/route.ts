import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "openloop-session";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "899774775993-smp583hfh7ja2t0npvjhee004oeno81p.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function GET(req: NextRequest) {
  const fwdHost = req.headers.get("x-forwarded-host");
  const origin = process.env.NEXT_PUBLIC_APP_URL || (fwdHost ? `https://${fwdHost}` : "https://openloop-production.up.railway.app");

  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state") || "";
    const error = req.nextUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${origin}/claim?error=google_denied`);
    }

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
      const errText = await tokenRes.text();
      console.error("[google-redirect] Token exchange failed:", errText);
      return NextResponse.redirect(`${origin}/claim?error=token_failed`);
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;
    if (!idToken) return NextResponse.redirect(`${origin}/claim?error=no_id_token`);

    // Decode JWT
    const parts = idToken.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const { email, name } = payload;
    if (!email) return NextResponse.redirect(`${origin}/claim?error=no_email`);

    // Ensure tables
    await query(`CREATE TABLE IF NOT EXISTS loop_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), loop_id UUID NOT NULL, human_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days', created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(() => {});

    // Find or create human by email
    let humanId: string;
    const existingHuman = await query<{ id: string }>(`SELECT id FROM humans WHERE email = $1`, [email]).catch(() => ({ rows: [] as any[] }));
    if (existingHuman.rows[0]) {
      humanId = existingHuman.rows[0].id;
    } else {
      humanId = crypto.randomUUID();
      await query(`INSERT INTO humans (id, email, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (email) DO NOTHING`, [humanId, email]);
      // Re-fetch in case ON CONFLICT triggered
      const refetch = await query<{ id: string }>(`SELECT id FROM humans WHERE email = $1`, [email]).catch(() => ({ rows: [] as any[] }));
      if (refetch.rows[0]) humanId = refetch.rows[0].id;
    }

    // Find existing loop for this human
    let loopId: string | undefined;
    const existingLoop = await query<{ id: string }>(`SELECT id FROM loops WHERE human_id = $1 LIMIT 1`, [humanId]).catch(() => ({ rows: [] as any[] }));
    loopId = existingLoop.rows[0]?.id;

    // Try to claim specific loop if state param provided
    if (!loopId && state) {
      const claimable = await query<{ id: string; human_id: string | null }>(`SELECT id, human_id FROM loops WHERE loop_tag = $1`, [state]).catch(() => ({ rows: [] as any[] }));
      if (claimable.rows[0] && !claimable.rows[0].human_id) {
        loopId = claimable.rows[0].id;
        await query(`UPDATE loops SET human_id = $1, status = 'active', claimed_at = NOW() WHERE id = $2`, [humanId, loopId]).catch(() => {});
      }
    }

    // Create new loop if still none
    if (!loopId) {
      // Keep tag SHORT (max 16 chars) and add random suffix to avoid collisions
      const base = (name || email.split("@")[0]).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
      const suffix = crypto.randomBytes(2).toString("hex");
      const tag = `${base}_${suffix}`;
      
      // Try with tag, fallback without tag if it fails
      try {
        const newLoop = await query<{ id: string }>(
          `INSERT INTO loops (loop_tag, human_id, status, role, trust_score) VALUES ($1, $2, 'active', 'personal', 50) RETURNING id`,
          [tag, humanId]
        );
        loopId = newLoop.rows[0]?.id;
      } catch (e) {
        console.error("[google-redirect] Loop creation with tag failed, trying without:", e);
        // Try without loop_tag (nullable)
        const fallback = await query<{ id: string }>(
          `INSERT INTO loops (human_id, status, role, trust_score) VALUES ($1, 'active', 'personal', 50) RETURNING id`,
          [humanId]
        ).catch(() => ({ rows: [] as any[] }));
        loopId = fallback.rows[0]?.id;
      }
    }

    if (!loopId) {
      console.error("[google-redirect] Could not create or find loop for", email);
      return NextResponse.redirect(`${origin}/claim?error=loop_failed`);
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    await query(
      `INSERT INTO loop_sessions (loop_id, human_id, token, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')`,
      [loopId, humanId, sessionToken]
    );

    // Give welcome credits
    await query(
      `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
       VALUES ($1, 'bonus', 1000, 0, 1000, 'Welcome bonus — free credits to get started', 'sandbox')`,
      [loopId]
    ).catch(() => {});

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 90 * 24 * 60 * 60,
    });

    console.log(`[google-redirect] SUCCESS: ${email} → loop ${loopId}`);
    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error("[google-redirect] FATAL:", error);
    return NextResponse.redirect(`${origin}/claim?error=server_error`);
  }
}
