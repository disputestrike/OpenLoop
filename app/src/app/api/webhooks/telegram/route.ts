import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { loadPersistentMemory, updatePersistentMemory } from "@/lib/persistent-memory";

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const CHANNEL = "telegram";

function getCerebrasKey(): string {
  return process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY_2 || "";
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

/**
 * POST /api/webhooks/telegram
 * Telegram sends updates here when users message the bot
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: If TELEGRAM_BOT_SECRET_TOKEN is set, require matching header
    const secretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;
    if (secretToken) {
      const token = req.headers.get("x-telegram-bot-api-secret-token");
      if (!token || token !== secretToken) {
        console.warn("[telegram] Unauthorized webhook attempt - invalid or missing token");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Read body once (consumes stream)
    const update = await req.json().catch(() => ({}));
    const message = update?.message;

    // SECURITY: Rate limiting by chatId
    try {
      const chatId = message?.chat?.id ?? update?.callback_query?.message?.chat?.id;
      if (chatId) {
        const { checkRateLimitTelegram } = await import("@/lib/rate-limit");
        if (await checkRateLimitTelegram(chatId)) {
          console.warn("[telegram] Rate limit exceeded for chatId:", chatId);
          return NextResponse.json({ ok: true });
        }
      }
    } catch (rateLimitErr) {
      console.warn("[telegram-rate-limit] Check failed, proceeding:", rateLimitErr);
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ ok: true, message: "Bot not configured" });
    }
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const username = message.from?.username || message.from?.first_name || "User";

    // /start command — register user
    if (userText === "/start") {
      // Check if telegram chat is linked to a Loop
      const linked = await query<{ loop_tag: string }>(
        `SELECT l.loop_tag FROM loops l WHERE l.telegram_chat_id = $1 LIMIT 1`,
        [chatId.toString()]
      ).catch(() => ({ rows: [] as any[] }));

      if (linked.rows[0]) {
        await sendTelegramMessage(chatId, `Welcome back! You're connected to @${linked.rows[0].loop_tag}. Send any message to talk to your Loop.`);
      } else {
        await sendTelegramMessage(chatId,
          `🔵 *Welcome to OpenLoop!*\n\nI'm your AI Loop — I negotiate deals, research, book appointments, and more.\n\nTo link your account, go to your OpenLoop Dashboard → Settings → Connect Telegram, and enter this code:\n\n\`${chatId}\`\n\nOr just start chatting — I'll create a Loop for you automatically.`
        );

        // Auto-create a loop for this telegram user
        const tag = `tg_${username}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 16);
        try {
          const newLoop = await query<{ id: string }>(
            `INSERT INTO loops (loop_tag, status, role, trust_score, telegram_chat_id)
             VALUES ($1, 'active', 'personal', 50, $2) RETURNING id`,
            [tag, chatId.toString()]
          );
          if (newLoop.rows[0]) {
            await sendTelegramMessage(chatId, `✅ Your Loop @${tag} is ready! Send any message to get started.`);
          }
        } catch {
          // telegram_chat_id column might not exist, try without
          await query(
            `INSERT INTO loops (loop_tag, status, role, trust_score) VALUES ($1, 'active', 'personal', 50) ON CONFLICT DO NOTHING`,
            [tag]
          ).catch(() => {});
          await sendTelegramMessage(chatId, `Your Loop is being set up. Send any message to chat!`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Regular message — find linked Loop and respond
    let loopId: string | undefined;
    let loopTag: string = "Loop";

    // Try to find Loop by telegram_chat_id
    const loopRes = await query<{ id: string; loop_tag: string }>(
      `SELECT id, loop_tag FROM loops WHERE telegram_chat_id = $1 LIMIT 1`,
      [chatId.toString()]
    ).catch(() => ({ rows: [] as any[] }));

    if (loopRes.rows[0]) {
      loopId = loopRes.rows[0].id;
      loopTag = loopRes.rows[0].loop_tag || "Loop";
    }

    // Generate AI response
    const key = getCerebrasKey();
    if (!key) {
      await sendTelegramMessage(chatId, "I'm temporarily offline. Try again in a moment.");
      return NextResponse.json({ ok: true });
    }

    // Load persistent memory so we don't forget context (e.g. "user asked for flight to Lagos", "departure city: DC")
    let memoryContext = "";
    if (loopId) {
      const mem = await loadPersistentMemory(loopId, null, CHANNEL);
      if (mem?.memory && Object.keys(mem.memory).length > 0) {
        const parts: string[] = [];
        if (mem.memory.last_task) parts.push(`Current task: ${mem.memory.last_task}`);
        if (mem.memory.last_user_intent) parts.push(`User intent: ${mem.memory.last_user_intent}`);
        if (mem.memory.last_summary) parts.push(`Recent context: ${mem.memory.last_summary}`);
        if (parts.length) memoryContext = `\n\nCONTEXT YOU MUST REMEMBER: ${parts.join(". ")}. Continue this thread; do not ask "what do you need?" again.`;
      }
    }

    // Get chat history for context (recent messages so we don't lose the thread)
    const historyRes = loopId ? await query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [loopId]
    ).catch(() => ({ rows: [] as any[] })) : { rows: [] as any[] };

    const history = historyRes.rows.reverse().map(r => ({ role: r.role, content: r.content }));

    const systemPrompt = `You are @${loopTag}, a personal AI Loop on OpenLoop. You help your human via Telegram. Be concise (Telegram messages should be short), helpful, and actionable. Include specific numbers when relevant. You can negotiate bills, research topics, book appointments, find deals, and more.

CRITICAL: Remember the conversation. If the user said they want a flight to Lagos and then said "DC", they mean Washington DC as the departure city. If they asked a follow-up or gave a detail, use it. Do not ask "What do you need help with?" when you are mid-task. Continue the thread.${memoryContext}`;

    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userText },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    let reply = "I'm processing your request. Give me a moment.";
    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      reply = data.choices?.[0]?.message?.content?.trim() || reply;
    }

    // Save to chat history and update persistent memory so next turn remembers
    if (loopId) {
      await query(`INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)`, [loopId, userText]).catch(() => {});
      await query(`INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`, [loopId, reply]).catch(() => {});

      const lower = userText.toLowerCase();
      const taskHint = lower.includes("flight") || lower.includes("lagos") || lower.includes("book") || lower.includes("travel") ? "flight/travel booking" : lower.includes("bill") || lower.includes("negotiat") ? "bill negotiation" : lower.includes("appointment") || lower.includes("schedule") ? "scheduling" : undefined;
      const summary = [userText.slice(0, 120), reply.slice(0, 80)].join(" → ");
      const toSave: Record<string, unknown> = {
        last_user_message: userText.slice(0, 300),
        last_assistant_message: reply.slice(0, 200),
        last_summary: summary,
        last_updated_at: new Date().toISOString(),
      };
      if (taskHint) toSave.last_task = taskHint;
      if (userText.length > 10) toSave.last_user_intent = userText.slice(0, 200);
      await updatePersistentMemory(loopId, null, CHANNEL, toSave, true);
    }

    // Send reply
    await sendTelegramMessage(chatId, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[telegram-webhook]", error);
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET /api/webhooks/telegram — health check + auto-register webhook
 */
export async function GET(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ status: "not_configured", message: "Set TELEGRAM_BOT_TOKEN to activate" });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";
  const webhookUrl = `${origin}/api/webhooks/telegram`;

  // Register webhook with Telegram
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });
  const data = await res.json();

  return NextResponse.json({ status: "configured", webhookUrl, telegramResponse: data });
}
