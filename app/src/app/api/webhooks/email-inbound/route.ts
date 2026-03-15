import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "Loop <noreply@openloop.app>";

function getCerebrasKey(): string {
  return process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY_2 || "";
}

/**
 * POST /api/webhooks/email-inbound
 * 
 * Receives inbound emails (from Resend inbound webhook, SendGrid, or Mailgun parse)
 * Parses sender, subject, body → finds Loop → generates reply → sends response
 * 
 * Expected payload (Resend format):
 * { from: "user@email.com", to: "loop-tag@openloop.app", subject: "...", text: "...", html: "..." }
 * 
 * Also supports SendGrid Inbound Parse format:
 * { from: "user@email.com", to: "loop-tag@openloop.app", subject: "...", text: "..." }
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      // SendGrid/Mailgun format
      const formData = await req.formData();
      body = {
        from: formData.get("from")?.toString() || "",
        to: formData.get("to")?.toString() || "",
        subject: formData.get("subject")?.toString() || "",
        text: formData.get("text")?.toString() || "",
      };
    } else {
      body = await req.json().catch(() => ({}));
    }

    const fromEmail = body.from || body.sender || "";
    const toEmail = body.to || body.recipient || "";
    const subject = body.subject || "(no subject)";
    const textBody = body.text || body.plain || body.body || "";

    if (!fromEmail || !textBody) {
      return NextResponse.json({ error: "Missing from or body" }, { status: 400 });
    }

    console.log(`[email-inbound] From: ${fromEmail}, To: ${toEmail}, Subject: ${subject}`);

    // Extract loop tag from the to address (e.g., loop-Marcus_Finance@openloop.app → Marcus_Finance)
    const tagMatch = toEmail.match(/loop[_-]?([A-Za-z0-9_]+)@/i);
    const loopTag = tagMatch?.[1] || "";

    // Find the Loop
    let loopId: string | undefined;
    let loopName = "Loop";

    if (loopTag) {
      const loopRes = await query<{ id: string; loop_tag: string }>(
        `SELECT id, loop_tag FROM loops WHERE loop_tag ILIKE $1 LIMIT 1`,
        [loopTag]
      ).catch(() => ({ rows: [] as any[] }));
      if (loopRes.rows[0]) {
        loopId = loopRes.rows[0].id;
        loopName = loopRes.rows[0].loop_tag;
      }
    }

    // Store as inbox message
    if (loopId) {
      await query(
        `INSERT INTO loop_messages (from_loop_id, to_loop_id, content, message_type)
         VALUES ($1, $2, $3, 'email')`,
        [loopId, loopId, `[Email from ${fromEmail}] Subject: ${subject}\n\n${textBody.slice(0, 4000)}`]
      ).catch(() => {});
    }

    // Generate AI response
    const key = getCerebrasKey();
    if (!key) {
      return NextResponse.json({ ok: true, message: "Received but no AI key for reply" });
    }

    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `You are @${loopName}, an AI Loop on OpenLoop. You received an email and need to reply helpfully. Be professional, concise, and actionable. Include specific details when possible.` },
          { role: "user", content: `Email from: ${fromEmail}\nSubject: ${subject}\n\n${textBody.slice(0, 2000)}` },
        ],
        max_tokens: 400,
        temperature: 0.6,
      }),
    });

    let reply = "Thank you for your email. I'll process this and get back to you.";
    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      reply = data.choices?.[0]?.message?.content?.trim() || reply;
    }

    // Send reply email via Resend (if configured)
    if (RESEND_API_KEY && RESEND_API_KEY !== "re_mock_disabled") {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: fromEmail,
          subject: `Re: ${subject}`,
          text: `${reply}\n\n---\nSent by @${loopName} on OpenLoop\nhttps://openloop-production.up.railway.app/loop/${loopName}`,
        }),
      }).catch((e) => console.error("[email-inbound] Reply send failed:", e));
    }

    // Log as activity
    if (loopId) {
      await query(
        `INSERT INTO activities (source_type, loop_id, kind, title, domain) VALUES ('email', $1, 'outcome', $2, 'communication')`,
        [loopId, `Replied to email from ${fromEmail.split("@")[0]} re: ${subject.slice(0, 50)}`]
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, replied: true });
  } catch (error) {
    console.error("[email-inbound]", error);
    return NextResponse.json({ ok: true, error: "Processing failed" });
  }
}

/**
 * GET /api/webhooks/email-inbound — health check
 */
export async function GET() {
  return NextResponse.json({
    status: RESEND_API_KEY && RESEND_API_KEY !== "re_mock_disabled" ? "configured" : "not_configured",
    message: "POST emails to this endpoint. Supports Resend, SendGrid, and Mailgun inbound parse formats.",
    format: { from: "sender@email.com", to: "loop-Tag@openloop.app", subject: "...", text: "..." },
  });
}
