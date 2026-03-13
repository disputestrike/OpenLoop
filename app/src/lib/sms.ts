/**
 * B4 Channels — Twilio SMS helper. Optional: set TWILIO_* env to enable.
 */

let twilioClient: { messages: { create: (opts: { body: string; from: string; to: string }) => Promise<{ sid: string }> } } | null = null;

function getTwilio() {
  if (twilioClient) return twilioClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch {
    return null;
  }
}

export async function sendSMS(to: string, body: string): Promise<{ sid: string } | null> {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from) return null;
  try {
    const msg = await client.messages.create({
      body: `OpenLoop: ${body}`,
      from,
      to,
    });
    return { sid: msg.sid };
  } catch (e) {
    console.error("[sms]", e);
    return null;
  }
}

/** Handle incoming SMS (e.g. webhook). Keyword "status" → reply with Loop status. */
export async function handleIncomingSMS(from: string, body: string): Promise<string | null> {
  const lower = body.trim().toLowerCase();
  if (lower.includes("status")) {
    return "Your Loop is active. Check the dashboard for details.";
  }
  return `Task received: "${body.slice(0, 100)}". Your Loop will process this and update you.`;
}
