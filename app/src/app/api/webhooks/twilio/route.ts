/**
 * Twilio webhook — incoming SMS and WhatsApp.
 * Point your Twilio number or WhatsApp sandbox "When a message comes in" to:
 *   https://YOUR-APP-URL/api/webhooks/twilio
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (for SMS reply).
 * WhatsApp: use the same URL; Twilio uses the WhatsApp sender for reply when configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleIncomingSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    let from = "";
    let body = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      from = params.get("From") || "";
      body = params.get("Body") || "";
    } else {
      const form = await req.formData();
      from = (form.get("From") as string) || "";
      body = (form.get("Body") as string) || "";
    }

    if (!from || !body.trim()) {
      return new NextResponse("Missing From or Body", { status: 400 });
    }

    const reply = await handleIncomingSMS(from, body);
    const text = reply ?? "Got it. Your Loop will process this and update you in the app.";

    // Reply via TwiML so Twilio sends it (works for both SMS and WhatsApp)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (e) {
    console.error("[webhooks/twilio]", e);
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
