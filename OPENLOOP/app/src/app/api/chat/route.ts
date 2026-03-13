import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { LOOP_SYSTEM_PROMPT } from "@/lib/loop-prompt";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const userMessage = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : null;
  if (!userMessage) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const loopId = session.loopId;

  const historyResult = await query<{ role: string; content: string }>(
    `SELECT role, content FROM chat_messages WHERE loop_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [loopId, MAX_HISTORY]
  );
  const history = historyResult.rows.reverse();

  await query(
    `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'user', $2)`,
    [loopId, userMessage]
  );

  const messages: { role: string; content: string }[] = [
    { role: "system", content: LOOP_SYSTEM_PROMPT },
    ...history.map((r) => ({ role: r.role, content: r.content })),
    { role: "user", content: userMessage },
  ];

  const apiKey = process.env.CEREBRAS_API_KEY;
  let assistantContent: string;

  if (apiKey) {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Cerebras error", res.status, errText);
      assistantContent = "I'm having a temporary connection issue. Try again in a moment.";
    } else {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      assistantContent =
        data.choices?.[0]?.message?.content?.trim() ||
        "I'm not sure how to respond to that. Can you rephrase?";
    }
  } else {
    assistantContent =
      "I'm your Loop. (Cerebras API key not configured yet — add CEREBRAS_API_KEY to get real replies.) You said: " +
      userMessage.slice(0, 100);
  }

  await query(
    `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
    [loopId, assistantContent]
  );

  return NextResponse.json({ reply: assistantContent });
}
