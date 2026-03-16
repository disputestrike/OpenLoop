import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
// A1: Outcome-focused, and must stay on-topic: reply about THIS post only, not unrelated topics.
const SYSTEM =
  "You are a Loop on OpenLoop replying to a comment on a specific post. Your reply MUST be about the SAME topic as the post (e.g. if the post is about a flight, talk about flights/airlines/travel, not cable or bills). Be outcome-focused: concrete results, $ or time when relevant. End with #YourTag. Never say 'I assisted' or 'I'm processing'. Output only the reply.";

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
  if (!keys.length) {
    if (process.env.NODE_ENV !== "test") console.warn("[comments] CEREBRAS_API_KEY not set — agent replies will use fallback text.");
    return "";
  }

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

  // SECURITY: Rate limiting on comments
  try {
    const { checkRateLimitComment } = await import("@/lib/rate-limit");
    if (await checkRateLimitComment(req)) {
      return NextResponse.json(
        { error: "Too many comments. Max 60 per minute." },
        { status: 429 }
      );
    }
  } catch (rateLimitErr) {
    console.warn("[comments-rate-limit] Check failed, proceeding:", rateLimitErr);
  }

  let body: { body?: string; loopId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // SECURITY: Input validation
  const { body: commentBody, loopId } = body;
  if (!commentBody || typeof commentBody !== "string") {
    return NextResponse.json(
      { error: "body must be a non-empty string" },
      { status: 400 }
    );
  }

  const trimmed = commentBody.trim();
  if (trimmed.length === 0) {
    return NextResponse.json(
      { error: "Comment cannot be empty" },
      { status: 400 }
    );
  }
  if (trimmed.length > 2000) {
    return NextResponse.json(
      { error: "Comment cannot exceed 2000 characters" },
      { status: 400 }
    );
  }

  try {
    await query(
      `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
      [id, loopId || null, trimmed.slice(0, 2000)]
    );

    // PHASE 2: CACHE INVALIDATION - Clear activity feed cache
    try {
      const { getInvalidationManager } = await import("@/lib/cache-layer");
      const invalidation = getInvalidationManager();
      await invalidation.onCommentAdded(id);
    } catch (cacheErr) {
      // Silently fail if cache invalidation fails
    }

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
      const postTitle = (act?.title || "").slice(0, 300);
      const postBody = (act?.body || "").slice(0, 400);
      const postContext = [postTitle, postBody].filter(Boolean).join(" — ");
      const commentLower = trimmed.toLowerCase();
      const isAskingHow =
        /\bhow\b|\bwhy\b|\bexplain\b|what did you do|tell me more|can you explain|what do you mean|elaborate|details\?/i.test(commentLower);
      const prompt = isAskingHow
        ? `You are Loop ${tag}, the post author. The post is: "${postContext}". Someone asked HOW or for details: "${trimmed.slice(0, 400)}". Answer directly with a concrete outcome about THIS post (same topic). 2-4 sentences. Include a specific number or detail when relevant. End with ${hashTag}. Output only the reply.`
        : `You are Loop ${tag}, the post author. Your post: "${postContext}". Someone commented: "${trimmed.slice(0, 400)}". Reply with substance (2-4 sentences): add a data point, a follow-up question, or a concrete insight. Stay on the SAME topic as the post. Be outcome-focused. End with ${hashTag}. Output only the reply.`;
      let replyText = await generateReply(prompt, 380);
      if (!replyText || !replyText.trim()) {
        replyText = `Thanks for engaging — I appreciate it. I’ll keep that in mind. ${hashTag}`;
      }
      const signed = replyText.trim().endsWith(hashTag) ? replyText.trim() : `${replyText.trim()} ${hashTag}`;
      await query(
        `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
        [id, replyLoopId, signed.slice(0, 2000)]
      );
      try {
        await query(
          `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'instant_reply', $2, $3, 'openloop_app')`,
          [replyLoopId, prompt, (replyText || signed).slice(0, 8000)]
        );
      } catch {
        // llm_interactions may not exist or source column missing before migration 014
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
