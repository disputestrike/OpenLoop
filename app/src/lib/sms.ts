/**
 * OpenLoop SMS/WhatsApp handler — B4 Channels
 * Wire this to Twilio webhook at POST /api/webhooks/twilio
 * Replaces the old handleIncomingSMS stub with real AI + KB context
 */

import { query } from "./db";
import { LOOP_SYSTEM_PROMPT } from "./loop-prompt";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

let twilioClient: {
  messages: { create: (opts: { body: string; from: string; to: string }) => Promise<{ sid: string }> };
} | null = null;

function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !auth) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require("twilio");
    twilioClient = twilio(sid, auth);
    return twilioClient;
  } catch { return null; }
}

export async function sendSMS(to: string, body: string): Promise<{ sid: string } | null> {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from) return null;
  try {
    return await client.messages.create({ body: `OpenLoop: ${body}`, from, to });
  } catch (e) {
    console.error("[sms/send]", e);
    return null;
  }
}

export async function handleIncomingSMS(from: string, body: string): Promise<string | null> {
  const lower = body.trim().toLowerCase();

  // ── 1. Find Loop by phone number ─────────────────────────
  const loopRes = await query<{
    id: string; loop_tag: string; persona: string;
    skill_tier: number; trust_score: number;
  }>(
    `SELECT id, loop_tag, persona, skill_tier, trust_score
     FROM loops WHERE phone_number = $1 AND status = 'active' LIMIT 1`,
    [from]
  ).catch(() => ({ rows: [] }));

  const loop = loopRes.rows[0];

  // ── New user — no Loop linked yet ─────────────────────────
  if (!loop) {
    if (lower.includes("claim") || lower.includes("start") || lower.includes("hello") || lower.includes("hi")) {
      return `Welcome to OpenLoop! Claim your free AI agent at ${process.env.NEXT_PUBLIC_APP_URL || "openloop.app"} — then link your phone number in the dashboard to chat with your Loop here.`;
    }
    return `No Loop found for this number. Claim yours free at ${process.env.NEXT_PUBLIC_APP_URL || "openloop.app"}`;
  }

  // ── 2. Get chat history ───────────────────────────────────
  const historyRes = await query<{ role: string; content: string }>(
    `SELECT role, content FROM chat_messages
     WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 15`,
    [loop.id]
  ).catch(() => ({ rows: [] }));
  const history = historyRes.rows.reverse();

  // ── 3. Get knowledge base ─────────────────────────────────
  const kbRes = await query<{ content: string }>(
    `SELECT content FROM loop_knowledge WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [loop.id]
  ).catch(() => ({ rows: [] }));
  const kbContext = kbRes.rows.map(r => r.content).join("\n");

  // ── 4. Get persistent memory ──────────────────────────────
  const memRes = await query<{ memory_type: string; content: string }>(
    `SELECT memory_type, content FROM loop_memory
     WHERE loop_id = $1 ORDER BY updated_at DESC LIMIT 5`,
    [loop.id]
  ).catch(() => ({ rows: [] }));
  const memContext = memRes.rows.map(r => `[${r.memory_type}] ${r.content}`).join("\n");

  // ── 5. Build system prompt with full context ──────────────
  let systemPrompt = LOOP_SYSTEM_PROMPT;
  if (kbContext) systemPrompt += `\n\nUser knowledge base:\n${kbContext}`;
  if (memContext) systemPrompt += `\n\nRemembered from past conversations:\n${memContext}`;
  systemPrompt += `\n\nYou are replying via SMS/WhatsApp. Keep responses under 160 characters when possible. Be direct and specific.`;
  systemPrompt += `\nLoop persona: ${loop.persona}. Trust score: ${loop.trust_score}%. Skill tier: ${loop.skill_tier}.`;

  // ── 6. Call Cerebras ──────────────────────────────────────
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return `Your Loop ${loop.loop_tag} is ready. Configure CEREBRAS_API_KEY to enable AI replies.`;

  let reply: string;
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(r => ({ role: r.role, content: r.content })),
          { role: "user", content: body },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[sms/cerebras]", res.status, err);
      reply = `Your Loop ${loop.loop_tag} received your message and will follow up in the app.`;
    } else {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      reply = data.choices?.[0]?.message?.content?.trim() ?? `Your Loop ${loop.loop_tag} is thinking. Check the app for updates.`;
    }
  } catch (e) {
    console.error("[sms/fetch]", e);
    reply = `Your Loop is temporarily unavailable. Check the app at ${process.env.NEXT_PUBLIC_APP_URL || "openloop.app"}`;
  }

  // ── 7. Log to database ────────────────────────────────────
  await query(
    "INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)",
    [loop.id, body]
  ).catch(() => {});
  await query(
    `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
    [loop.id, reply]
  ).catch(() => {});
  await query(
    `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'sms', $2, $3, 'twilio')`,
    [loop.id, body, reply.slice(0, 8000)]
  ).catch(() => {});

  // ── 8. Update Loop last-active ────────────────────────────
  await query("UPDATE loops SET updated_at = now() WHERE id = $1", [loop.id]).catch(() => {});

  return reply;
}
