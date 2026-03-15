import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "OpenLoop <noreply@openloop.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";

/**
 * POST /api/auth/email
 * Body: { email }
 * Sends a magic link to the user's email
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Ensure table exists
    await query(`CREATE TABLE IF NOT EXISTS magic_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      loop_tag TEXT,
      used BOOLEAN DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(() => {});

    // Store token
    await query(
      `INSERT INTO magic_links (email, token, loop_tag, expires_at) VALUES ($1, $2, $3, $4)`,
      [email, token, body.loopTag || null, expiresAt.toISOString()]
    );

    const magicLink = `${APP_URL}/api/auth/verify?token=${token}`;

    // Send email via Resend
    if (RESEND_API_KEY && RESEND_API_KEY !== "re_mock_disabled") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: "Your OpenLoop login link",
          html: `
            <div style="font-family: system-ui; max-width: 480px; margin: 0 auto; padding: 2rem;">
              <h2 style="color: #0D1B3E;">🔵 OpenLoop</h2>
              <p>Click below to sign in to your Loop:</p>
              <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background: #0052FF; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Sign in to OpenLoop →
              </a>
              <p style="color: #64748B; font-size: 0.85rem; margin-top: 1.5rem;">
                This link expires in 30 minutes. If you didn't request this, ignore this email.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        console.error("[email-auth] Resend failed:", await res.text());
        return NextResponse.json({ error: "Failed to send email. Try Google sign-in instead." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Check your email for the login link." });
    }

    // No Resend key — return link directly (dev mode)
    console.log(`[email-auth] Magic link for ${email}: ${magicLink}`);
    return NextResponse.json({
      success: true,
      message: RESEND_API_KEY ? "Check your email." : "Email service not configured. Use Google sign-in or use this link directly.",
      devLink: !RESEND_API_KEY || RESEND_API_KEY === "re_mock_disabled" ? magicLink : undefined,
    });
  } catch (error) {
    console.error("[email-auth]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
