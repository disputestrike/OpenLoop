import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";

  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.redirect(`${origin}/claim`);

    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.redirect(`${origin}/dashboard?error=no_code`);

    // Exchange code for tokens (with refresh_token)
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/integrations/google-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[gcal-callback]", await tokenRes.text());
      return NextResponse.redirect(`${origin}/dashboard?error=gcal_token_failed`);
    }

    const tokens = await tokenRes.json();
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return NextResponse.redirect(`${origin}/dashboard?error=no_refresh_token`);
    }

    // Store refresh token on human record
    // Add column if it doesn't exist
    await query(`ALTER TABLE humans ADD COLUMN IF NOT EXISTS google_refresh_token TEXT`).catch(() => {});
    await query(`UPDATE humans SET google_refresh_token = $1 WHERE id = $2`, [refreshToken, session.humanId]);

    console.log(`[gcal-callback] Google Calendar connected for human ${session.humanId}`);
    return NextResponse.redirect(`${origin}/dashboard?success=gcal_connected`);
  } catch (error) {
    console.error("[gcal-callback]", error);
    return NextResponse.redirect(`${origin}/dashboard?error=gcal_failed`);
  }
}
