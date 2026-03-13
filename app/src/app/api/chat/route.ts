import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildLoopPrompt } from "@/lib/loop-prompt";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userMessage = typeof body.message === "string"
    ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : null;
  if (!userMessage) return NextResponse.json({ error: "message required" }, { status: 400 });

  const { loopId } = session;

  // ── Load everything in parallel ──────────────────────────
  const [loopRes, historyRes, kbRes, memoryRes] = await Promise.all([
    query<{ loop_tag: string; persona: string; skill_tier: number; trust_score: number }>(
      "SELECT loop_tag, persona, skill_tier, trust_score FROM loops WHERE id = $1", [loopId]
    ),
    query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages WHERE loop_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [loopId, MAX_HISTORY]
    ),
    query<{ content: string }>(
      "SELECT content FROM loop_knowledge WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 10", [loopId]
    ),
    query<{ memory_type: string; content: string }>(
      "SELECT memory_type, content FROM loop_memory WHERE loop_id = $1 ORDER BY updated_at DESC LIMIT 8", [loopId]
    ),
  ]);

  const loop = loopRes.rows[0];
  const history = historyRes.rows.reverse();
  const kb = kbRes.rows.map(r => r.content).join("\n");
  const memory = memoryRes.rows.map(r => `[${r.memory_type}] ${r.content}`).join("\n");

  // ── Build context-aware system prompt ────────────────────
  const systemPrompt = buildLoopPrompt({
    persona: loop?.persona,
    loopTag: loop?.loop_tag,
    trustScore: loop?.trust_score,
    skillTier: loop?.skill_tier,
    knowledgeBase: kb,
    recentMemory: memory,
    channel: "web",
  });

  // ── Save user message ─────────────────────────────────────
  await query(
    "INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)", [loopId, userMessage]
  );

  // ── Call Cerebras ─────────────────────────────────────────
  const apiKey = process.env.CEREBRAS_API_KEY;
  let assistantContent: string;

  if (apiKey) {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(r => ({ role: r.role, content: r.content })),
          { role: "user", content: userMessage },
        ],
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[chat] Cerebras error", res.status, err);
      assistantContent = "I'm having a temporary connection issue. Try again in a moment.";
    } else {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      assistantContent = data.choices?.[0]?.message?.content?.trim()
        ?? "I'm not sure how to respond to that. Can you rephrase?";
    }
  } else {
    assistantContent = `I'm ${loop?.loop_tag || "your Loop"}. (Add CEREBRAS_API_KEY to Railway to enable AI replies.) You said: ${userMessage.slice(0, 100)}`;
  }

  // ── Save assistant reply + log interaction ────────────────
  const logRes = await query<{ id: string }>(
    `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source)
     VALUES ($1, 'chat', $2, $3, 'openloop_app') RETURNING id`,
    [loopId, userMessage, assistantContent.slice(0, 8000)]
  ).catch(() => ({ rows: [] }));
  const interactionId = logRes.rows[0]?.id ?? null;

  await query(
    "INSERT INTO chat_messages (loop_id, role, content, llm_interaction_id) VALUES ($1, 'assistant', $2, $3)",
    [loopId, assistantContent, interactionId]
  );

  // ── Auto-extract memory from response (async, non-blocking) ──
  extractAndSaveMemory(loopId, userMessage, assistantContent).catch(() => {});

  return NextResponse.json({ reply: assistantContent, interactionId: interactionId ?? undefined });
}

// Lightweight async memory extraction — runs after response is sent
async function extractAndSaveMemory(loopId: string, userMsg: string, assistantMsg: string) {
  const combined = `${userMsg} ${assistantMsg}`.toLowerCase();

  // Simple pattern-based extraction (upgrade to LLM-extracted memory in Phase 3)
  const preferencePatterns = [
    /i (prefer|like|love|hate|dislike|want|need) (.{3,50})/gi,
    /my (budget|limit|max) is \$?[\d,]+/gi,
    /i (don't|do not) want (.{3,40})/gi,
  ];
  const factPatterns = [
    /my (comcast|att|verizon|netflix|hulu|gym|rent|mortgage) (bill|payment|plan) is \$?[\d.]+/gi,
    /i (live|am located) in (.{3,40})/gi,
    /i (work|am) (at|a|an) (.{3,40})/gi,
  ];

  for (const pattern of preferencePatterns) {
    const matches = combined.matchAll(pattern);
    for (const match of matches) {
      await query(
        "INSERT INTO loop_memory (loop_id, memory_type, content, source) VALUES ($1, 'preference', $2, 'chat')",
        [loopId, match[0].slice(0, 200)]
      ).catch(() => {});
    }
  }
  for (const pattern of factPatterns) {
    const matches = combined.matchAll(pattern);
    for (const match of matches) {
      await query(
        "INSERT INTO loop_memory (loop_id, memory_type, content, source) VALUES ($1, 'fact', $2, 'chat')",
        [loopId, match[0].slice(0, 200)]
      ).catch(() => {});
    }
  }
}
