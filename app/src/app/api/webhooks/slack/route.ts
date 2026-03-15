import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

function getCerebrasKey(): string {
  return process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY_2 || "";
}

async function sendSlackMessage(channel: string, text: string): Promise<void> {
  if (!SLACK_BOT_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    body: JSON.stringify({ channel, text }),
  }).catch(() => {});
}

/**
 * POST /api/webhooks/slack
 * Handles Slack Events API (messages, app_mention) and URL verification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Slack URL verification challenge
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Event callback
    if (body.type === "event_callback") {
      const event = body.event;
      if (!event) return NextResponse.json({ ok: true });

      // Ignore bot messages (prevent loops)
      if (event.bot_id || event.subtype === "bot_message") {
        return NextResponse.json({ ok: true });
      }

      // Handle direct messages and @mentions
      if (event.type === "message" || event.type === "app_mention") {
        const userText = event.text?.replace(/<@[A-Z0-9]+>/g, "").trim() || "";
        const channel = event.channel;
        const userId = event.user;

        if (!userText || !channel) return NextResponse.json({ ok: true });

        // Find Loop linked to this Slack user/workspace
        let loopId: string | undefined;
        let loopTag = "Loop";

        const loopRes = await query<{ id: string; loop_tag: string }>(
          `SELECT id, loop_tag FROM loops WHERE slack_channel_id = $1 OR slack_user_id = $2 LIMIT 1`,
          [channel, userId || ""]
        ).catch(() => ({ rows: [] as any[] }));

        if (loopRes.rows[0]) {
          loopId = loopRes.rows[0].id;
          loopTag = loopRes.rows[0].loop_tag || "Loop";
        }

        // Generate response
        const key = getCerebrasKey();
        if (!key) {
          await sendSlackMessage(channel, "I'm temporarily offline. Try again shortly.");
          return NextResponse.json({ ok: true });
        }

        const res = await fetch(CEREBRAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: `You are @${loopTag}, an AI Loop on OpenLoop, responding in Slack. Be concise and use Slack formatting (*bold*, _italic_, \`code\`). Help with tasks, research, negotiations, and more. Include specific numbers when relevant.` },
              { role: "user", content: userText },
            ],
            max_tokens: 400,
            temperature: 0.7,
          }),
        });

        let reply = "Processing your request...";
        if (res.ok) {
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          reply = data.choices?.[0]?.message?.content?.trim() || reply;
        }

        // Save to chat history
        if (loopId) {
          await query(`INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)`, [loopId, userText]).catch(() => {});
          await query(`INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`, [loopId, reply]).catch(() => {});
        }

        await sendSlackMessage(channel, reply);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[slack-webhook]", error);
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET /api/webhooks/slack — health check
 */
export async function GET() {
  return NextResponse.json({
    status: SLACK_BOT_TOKEN ? "configured" : "not_configured",
    message: SLACK_BOT_TOKEN ? "Slack bot active" : "Set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET to activate",
  });
}
