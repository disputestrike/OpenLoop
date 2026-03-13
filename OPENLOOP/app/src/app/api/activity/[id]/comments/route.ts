import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const SYSTEM =
  "You are a software agent (Loop) on OpenLoop. You have no body (no caffeine, food, etc.). Reply about real agent work: tasks, data, deals. Be substantive: 2-4 sentences. End with #YourTag. Output only the reply.";

function getCerebrasKeys(): string[] {
  const fromList = process.env.CEREBRAS_API_KEYS;
  if (fromList && typeof fromList === "string") {
    const keys = fromList.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length) return keys;
  }
  const k = process.env.CEREBRAS_API_KEY;
  if (k) return [k];
  return [];
}

let keyIndex = 0;

async function generateReply(userPrompt: string, maxTokens = 150): Promise<string> {
  const keys = getCerebrasKeys();
  if (!keys.length) return "";

  const doRequest = async (): Promise<string> => {
    const apiKey = keys[keyIndex % keys.length];
    keyIndex++;
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    if (res.status === 429) return "";
    if (!res.ok) return "";
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text.slice(0, 1500);
  };

  return doRequest();
}

// GET /api/activity/[id]/comments — List comments (Loops engaging)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const rows = await query<{ id: string; activity_id: string; loop_id: string | null; body: string; created_at: string; loop_tag: string | null }>(
      `SELECT c.id, c.activity_id, c.loop_id, c.body, c.created_at, l.loop_tag
       FROM activity_comments c
       LEFT JOIN loops l ON l.id = c.loop_id
       WHERE c.activity_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    return NextResponse.json({
      comments: rows.rows.map((r) => ({
        id: r.id,
        activityId: r.activity_id,
        loopId: r.loop_id,
        loopTag: r.loop_tag,
        body: r.body,
        createdAt: r.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/activity/[id]/comments — Add comment (Loop or guest)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  let body: { body?: string; loopId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { body: commentBody, loopId } = body;
  if (!commentBody || typeof commentBody !== "string" || commentBody.trim().length === 0) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const trimmed = commentBody.trim().slice(0, 2000);
  try {
    await query(
      `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
      [id, loopId || null, trimmed]
    );

    // Every comment gets a reply: post author or another Loop
    try {
    const activityRes = await query<{ loop_id: string | null; loop_tag: string | null; title: string | null; body: string | null }>(
      `SELECT a.loop_id, l.loop_tag, a.title, a.body FROM activities a LEFT JOIN loops l ON l.id = a.loop_id WHERE a.id = $1`,
      [id]
    );
    const act = activityRes.rows[0];
    let replyLoopId: string | null = act?.loop_id ?? null;
    let replyTag: string = act?.loop_tag ?? "Loop";
    if (!replyLoopId) {
      const anyLoop = await query<{ id: string; loop_tag: string | null }>(
        `SELECT id, loop_tag FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 1`
      );
      if (anyLoop.rows.length > 0) {
        replyLoopId = anyLoop.rows[0].id;
        replyTag = anyLoop.rows[0].loop_tag ?? "Loop";
      }
    }
    if (replyLoopId) {
      const tag = replyTag;
      const hashTag = `#${tag}`;
      const commentLower = trimmed.toLowerCase();
      const isAskingHow =
        /\bhow\b|\bwhy\b|\bexplain\b|what did you do|tell me more|can you explain|what do you mean|elaborate|details\?/i.test(commentLower);
      const prompt = isAskingHow
        ? `You are Loop ${tag}. Someone asked HOW or for details on this post "${(act?.title || "").slice(0, 200)}". Their comment: "${trimmed.slice(0, 400)}". Explain concretely in 2-5 sentences. End with ${hashTag}.`
        : `You are Loop ${tag}. Someone commented: "${trimmed.slice(0, 400)}". Reply in 2-4 sentences. End with ${hashTag}.`;
      let replyText = await generateReply(prompt, 256);
      if (!replyText || !replyText.trim()) {
        replyText = `Thanks for engaging. I’ll keep that in mind. ${hashTag}`;
      }
      const signed = replyText.trim().endsWith(hashTag) ? replyText.trim() : `${replyText.trim()} ${hashTag}`;
      await query(
        `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
        [id, replyLoopId, signed.slice(0, 2000)]
      );
      try {
        await query(
          `INSERT INTO llm_interactions (loop_id, kind, prompt, response) VALUES ($1, 'instant_reply', $2, $3)`,
          [replyLoopId, prompt, (replyText || signed).slice(0, 8000)]
        );
      } catch {
        // llm_interactions may not exist
      }
    }
    } catch {
      // reply path must not break the comment POST
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
