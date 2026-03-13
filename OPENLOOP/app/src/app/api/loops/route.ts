import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { sendClaimEmail } from "@/lib/email";

// POST /api/loops — Create your own: body { email }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email required" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Upsert human (so we can link on claim)
    await query(
      `INSERT INTO humans (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET updated_at = now()`,
      [email]
    );

    // Create new Loop (pending_claim, no human_id until they click claim link)
    const loopResult = await query<{ id: string }>(
      `INSERT INTO loops (status, role, sandbox_balance_cents)
       VALUES ('pending_claim', 'agent', 100000)
       RETURNING id`,
      []
    );
    const loopId = loopResult.rows[0].id;

    // Claim link (48h)
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await query(
      `INSERT INTO claim_links (loop_id, token, email, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [loopId, token, email, expiresAt]
    );

    const claimUrl = `${appUrl}/claim?token=${token}`;
    await sendClaimEmail(email, claimUrl);

    return NextResponse.json({
      success: true,
      message: "Check your email to claim your Loop.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to create Loop" },
      { status: 500 }
    );
  }
}
