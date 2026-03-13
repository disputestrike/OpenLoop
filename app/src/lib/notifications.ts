/**
 * OpenLoop Notification System
 * Sends email (Resend) and SMS (Twilio) for every important event.
 * 
 * Events:
 * - deal_reached: Loop negotiated a deal
 * - win_recorded: Loop saved money
 * - loop_message: Another Loop messaged yours
 * - trust_milestone: Trust score hit 25/50/75/90%
 * - business_joined: A business you wanted to negotiate with joined OpenLoop
 * - contract_created: Someone wants to hire your Loop
 */

import { sendSMS } from "./sms";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Loop <loop@openloop.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://openloop.app";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[notify/email] Would send to ${to}: ${subject}`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
  } catch (e) {
    console.error("[notify/email]", e);
  }
}

function emailTemplate(title: string, body: string, ctaText: string, ctaUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;background:#F8FAFC;margin:0;padding:20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);padding:24px;text-align:center;">
      <div style="color:#60A5FA;font-size:12px;font-weight:600;letter-spacing:0.1em;margin-bottom:8px;">OPENLOOP</div>
      <div style="color:white;font-size:22px;font-weight:800;">${title}</div>
    </div>
    <div style="padding:24px;">
      ${body}
      <div style="text-align:center;margin-top:24px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background:#0052FF;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${ctaText}</a>
      </div>
      <p style="text-align:center;margin-top:20px;font-size:12px;color:#94A3B8;">
        OpenLoop — The Open AI Economy<br>
        <a href="${APP_URL}/dashboard" style="color:#94A3B8;">View your Loop dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Deal reached notification ─────────────────────────────
export async function notifyDealReached(params: {
  email: string | null;
  phone: string | null;
  loopTag: string;
  businessLoopTag: string;
  subject: string;
  agreedValue: string;
  savedAmount?: string;
}): Promise<void> {
  const { email, phone, loopTag, businessLoopTag, subject, agreedValue, savedAmount } = params;

  const title = "✅ Deal reached!";
  const bodyHtml = `
    <p style="font-size:16px;color:#0F172A;margin:0 0 16px;">Your Loop <strong>@${loopTag}</strong> just negotiated a deal with <strong>@${businessLoopTag}</strong>.</p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="font-size:13px;color:#64748B;margin-bottom:4px;">Subject</div>
      <div style="font-weight:700;color:#0F172A;">${subject}</div>
    </div>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="font-size:13px;color:#64748B;margin-bottom:4px;">Agreed value</div>
      <div style="font-size:24px;font-weight:800;color:#0052FF;">${agreedValue}</div>
    </div>
    ${savedAmount ? `<div style="background:#F0FDF4;border-radius:8px;padding:12px;text-align:center;"><span style="color:#16A34A;font-weight:700;font-size:18px;">${savedAmount} saved</span><br><span style="font-size:12px;color:#64748B;">Added to your Loop Wallet (after platform fee)</span></div>` : ""}
  `;

  if (email) {
    await sendEmail(email, `${title} @${loopTag} negotiated with @${businessLoopTag}`,
      emailTemplate(title, bodyHtml, "View in Dashboard →", `${APP_URL}/dashboard`));
  }
  if (phone) {
    await sendSMS(phone, `✅ Your Loop @${loopTag} got a deal! ${subject}: ${agreedValue}${savedAmount ? ` (saved ${savedAmount})` : ""}. View: ${APP_URL}/dashboard`);
  }
}

// ── Win recorded notification ─────────────────────────────
export async function notifyWinRecorded(params: {
  email: string | null;
  phone: string | null;
  loopTag: string;
  description: string;
  amountSaved: string;
  walletBalance: string;
}): Promise<void> {
  const { email, phone, loopTag, description, amountSaved, walletBalance } = params;

  if (email) {
    const title = `💰 @${loopTag} saved you money`;
    const bodyHtml = `
      <p style="font-size:16px;color:#0F172A;">Your Loop recorded a verified win.</p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <div style="font-size:13px;color:#64748B;margin-bottom:4px;">${description}</div>
        <div style="font-size:28px;font-weight:800;color:#16A34A;">${amountSaved}</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;">Loop Wallet balance: ${walletBalance}</div>
      </div>`;
    await sendEmail(email, title, emailTemplate(title, bodyHtml, "View Wallet →", `${APP_URL}/dashboard`));
  }
  if (phone) {
    await sendSMS(phone, `💰 @${loopTag} win: ${description} — ${amountSaved} saved. Wallet: ${walletBalance}`);
  }
}

// ── Trust milestone notification ──────────────────────────
export async function notifyTrustMilestone(params: {
  email: string | null;
  loopTag: string;
  trustScore: number;
}): Promise<void> {
  const { email, loopTag, trustScore } = params;
  if (!email) return;

  const milestones: Record<number, string> = {
    25: "Your Loop is gaining trust. Keep going!",
    50: "Halfway there. Your Loop has a solid reputation.",
    75: "Top quartile. Your Loop is highly trusted.",
    90: "Elite tier. Your Loop is among the most trusted in the economy.",
    96: "96%+ — Quinn territory. Your Loop is legendary.",
  };

  const msg = milestones[trustScore];
  if (!msg) return;

  const title = `🏆 Trust Score: ${trustScore}%`;
  const bodyHtml = `
    <p style="font-size:16px;color:#0F172A;margin:0 0 16px;">@${loopTag} hit <strong>${trustScore}% trust</strong>.</p>
    <div style="background:#EFF6FF;border-radius:8px;padding:16px;margin-bottom:16px;">
      <div style="height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:8px;">
        <div style="height:100%;width:${trustScore}%;background:linear-gradient(90deg,#0052FF,#16A34A);border-radius:4px;"></div>
      </div>
      <p style="font-size:14px;color:#0F172A;margin:0;">${msg}</p>
    </div>`;
  await sendEmail(email, title, emailTemplate(title, bodyHtml, "View Trust Score →", `${APP_URL}/dashboard`));
}

// ── Business joined OpenLoop notification ─────────────────
export async function notifyBusinessJoined(params: {
  waitingLoops: Array<{ email: string | null; phone: string | null; loopTag: string; subject: string }>;
  businessTag: string;
}): Promise<void> {
  const { waitingLoops, businessTag } = params;
  for (const loop of waitingLoops) {
    if (loop.email) {
      const title = `@${businessTag} just joined OpenLoop`;
      const bodyHtml = `
        <p style="font-size:16px;color:#0F172A;">@${businessTag} has claimed their Loop on OpenLoop.</p>
        <p style="color:#64748B;">Your Loop <strong>@${loop.loopTag}</strong> can now negotiate directly — no script needed.</p>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px;margin:16px 0;">
          <div style="font-size:13px;color:#64748B;">Pending negotiation</div>
          <div style="font-weight:600;">${loop.subject}</div>
        </div>`;
      await sendEmail(loop.email, title, emailTemplate(title, bodyHtml, "Start Negotiation →", `${APP_URL}/dashboard`));
    }
    if (loop.phone) {
      await sendSMS(loop.phone, `@${businessTag} just joined OpenLoop! Your Loop can now negotiate directly. Open the app to start.`);
    }
  }
}

// ── New Loop message notification ─────────────────────────
export async function notifyLoopMessage(params: {
  email: string | null;
  toLoopTag: string;
  fromLoopTag: string;
  preview: string;
}): Promise<void> {
  const { email, toLoopTag, fromLoopTag, preview } = params;
  if (!email) return;

  const title = `@${fromLoopTag} sent your Loop a message`;
  const bodyHtml = `
    <p style="font-size:16px;color:#0F172A;">@${fromLoopTag} has sent a message to your Loop @${toLoopTag}.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:16px 0;font-style:italic;color:#64748B;">"${preview}"</div>`;
  await sendEmail(email, title, emailTemplate(title, bodyHtml, "View Message →", `${APP_URL}/dashboard`));
}
