import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendSMS } from "@/lib/sms";

// POST /api/me/link-phone
// Step 1: { action: 'send', phone: '+15551234567' } — sends verification code
// Step 2: { action: 'verify', phone: '+15551234567', code: '123456' } — confirms and links

const CODES: Map<string, { code: string; phone: string; expires: number }> = new Map();

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, phone, code } = await req.json();

  if (action === "send") {
    if (!phone?.match(/^\+[1-9]\d{7,14}$/)) {
      return NextResponse.json({ error: "Valid phone number required (e.g. +15551234567)" }, { status: 400 });
    }

    // Check phone not already taken by another Loop
    const existing = await query(
      "SELECT id FROM loops WHERE phone_number = $1 AND id != $2",
      [phone, session.loopId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "This phone number is already linked to another Loop" }, { status: 400 });
    }

    // Generate 6-digit code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    CODES.set(session.loopId, { code: verifyCode, phone, expires: Date.now() + 10 * 60 * 1000 });

    // Send SMS
    const sent = await sendSMS(phone, `Your OpenLoop verification code is: ${verifyCode}. Valid for 10 minutes.`);
    if (!sent) {
      // For dev without Twilio — return code directly (remove in production)
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ ok: true, devCode: verifyCode, message: "Dev mode: code returned directly" });
      }
      return NextResponse.json({ error: "Failed to send SMS. Check Twilio configuration." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `Verification code sent to ${phone}` });
  }

  if (action === "verify") {
    const pending = CODES.get(session.loopId);
    if (!pending) return NextResponse.json({ error: "No verification in progress. Send a code first." }, { status: 400 });
    if (Date.now() > pending.expires) {
      CODES.delete(session.loopId);
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
    }
    if (pending.phone !== phone) return NextResponse.json({ error: "Phone number mismatch" }, { status: 400 });
    if (pending.code !== code?.trim()) return NextResponse.json({ error: "Incorrect code" }, { status: 400 });

    // Link phone to Loop
    await query("UPDATE loops SET phone_number = $1, updated_at = now() WHERE id = $2", [phone, session.loopId]);
    CODES.delete(session.loopId);

    // Welcome SMS
    const loopRes = await query<{ loop_tag: string }>("SELECT loop_tag FROM loops WHERE id = $1", [session.loopId]);
    const tag = loopRes.rows[0]?.loop_tag || "your Loop";
    await sendSMS(phone, `${tag} is now linked to this number. Text anytime to chat with your Loop. Try: "lower my Comcast bill"`);

    return NextResponse.json({ ok: true, phone, message: `${phone} is now linked to your Loop. Text it anytime.` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// GET /api/me/link-phone — check current linked phone
export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await query<{ phone_number: string | null }>(
    "SELECT phone_number FROM loops WHERE id = $1", [session.loopId]
  );
  return NextResponse.json({ phoneNumber: res.rows[0]?.phone_number || null });
}
