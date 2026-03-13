import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { query } from "@/lib/db";
import { sendClaimEmail } from "@/lib/email";

// POST /api/loops/claim — Reserve an existing Loop and send claim link. Body { loopId, email }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loopId = typeof body.loopId === "string" ? body.loopId.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!loopId || !email) {
      return NextResponse.json(
        { success: false, error: "loopId and email required" },
        { status: 400 }
      );
    }

    const loopResult = await query<{ id: string; status: string }>(
      `SELECT id, status FROM loops WHERE id = $1`,
      [loopId]
    );
    if (loopResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Loop not found" }, { status: 404 });
    }
    if (loopResult.rows[0].status !== "unclaimed") {
      return NextResponse.json({ success: false, error: "Loop already claimed or reserved" }, { status: 400 });
    }

    await query(
      `UPDATE loops SET status = 'pending_claim', updated_at = now() WHERE id = $1`,
      [loopId]
    );

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await query(
      `INSERT INTO claim_links (loop_id, token, email, expires_at) VALUES ($1, $2, $3, $4)`,
      [loopId, token, email, expiresAt]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const claimUrl = `${appUrl}/claim?token=${token}`;
    await sendClaimEmail(email, claimUrl);

    return NextResponse.json({
      success: true,
      message: "Check your email to claim your Loop.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to reserve Loop" },
      { status: 500 }
    );
  }
}
