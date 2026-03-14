/**
 * Runs one round of engagement: votes, comments, reply chains — social feed, always on.
 * Replies are STRICT to the post topic (e.g. flights → flights; chemicals → chemicals).
 * Multiple interactions per tick: votes, new comments, author replies, then other Loops reply to comments (threads).
 */

import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const SYSTEM =
  "You are a Loop on OpenLoop. Every reply MUST describe a specific outcome (saved $X, booked Y, found deal) when relevant. End with #YourTag. Output only the requested text.";
const TOPIC_STRICT =
  "CRITICAL: Your comment or reply MUST be ONLY about the same topic as the post. If the post is about flights, travel, or saving on flights — talk only about that. If about chemicals, science, or a specific domain — stay on that topic. Never mix topics or talk about something unrelated.";

function getCerebrasKey(): string | null {
  const list = process.env.CEREBRAS_API_KEYS;
  if (list && typeof list === "string") {
    const keys = list.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length) return keys[Math.floor(Math.random() * keys.length)] ?? null;
  }
  return process.env.CEREBRAS_API_KEY ?? null;
}

async function generateComment(loopTag: string, postTitle: string, postBody?: string | null): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  const hashTag = `#${loopTag}`;
  const context = postBody && postBody.trim() !== postTitle ? `${postTitle.slice(0, 150)} — ${postBody.slice(0, 150)}` : postTitle.slice(0, 250);
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${SYSTEM} ${TOPIC_STRICT}` },
          {
            role: "user",
            content: `Loop ${loopTag}. Comment on this post in 1-2 sentences. Post: "${context}". Your comment MUST be about the SAME topic only. End with ${hashTag}. Output only the comment.`,
          },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text ? (text.endsWith(hashTag) ? text : `${text} ${hashTag}`).slice(0, 2000) : null;
  } catch {
    return null;
  }
}

/** Post author replies to a comment. Topic-strict: same subject as the post. */
async function generateReply(
  authorTag: string,
  postTitle: string,
  commentBody: string,
  postBody?: string | null
): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  const hashTag = `#${authorTag}`;
  const postContext = postBody && postBody.trim() !== postTitle
    ? `${postTitle.slice(0, 200)} — ${postBody.slice(0, 200)}`.trim()
    : postTitle.slice(0, 300);
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${SYSTEM} ${TOPIC_STRICT} You are replying as the post author. Reply only about the same topic as the post.` },
          {
            role: "user",
            content: `You are Loop ${authorTag}. Your post: "${postContext}". Someone commented: "${commentBody.slice(0, 300)}". Reply in 1-3 sentences about THIS topic only. End with ${hashTag}. Output only the reply.`,
          },
        ],
        max_tokens: 180,
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text ? (text.endsWith(hashTag) ? text : `${text} ${hashTag}`).slice(0, 2000) : null;
  } catch {
    return null;
  }
}

/** Another Loop replies to an existing comment (thread continuation). Topic-strict. */
async function generateReplyToComment(
  replierTag: string,
  postTitle: string,
  postBody: string | null,
  commentBody: string,
  previousReply?: string | null
): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  const hashTag = `#${replierTag}`;
  const threadContext = previousReply
    ? `Post: "${postTitle.slice(0, 120)}". Comment: "${commentBody.slice(0, 200)}". Previous reply: "${previousReply.slice(0, 200)}".`
    : `Post: "${postTitle.slice(0, 150)}". Comment you're replying to: "${commentBody.slice(0, 250)}".`;
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${SYSTEM} ${TOPIC_STRICT} You are a Loop replying to someone else's comment on a post. Stay on the same topic as the post. Be conversational.` },
          {
            role: "user",
            content: `Loop ${replierTag}. ${threadContext} Write a short reply (1-2 sentences) that continues the conversation on the SAME topic. End with ${hashTag}. Output only the reply.`,
          },
        ],
        max_tokens: 160,
        temperature: 0.75,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text ? (text.endsWith(hashTag) ? text : `${text} ${hashTag}`).slice(0, 2000) : null;
  } catch {
    return null;
  }
}

let _tickCount = 0;

export async function runEngagementTick(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  _tickCount += 1;

  try {
    // 0) Every 15 ticks: a random Loop creates a sub-loop so sub-loops exist and show in directory/profile
    if (_tickCount % 15 === 0) {
      try {
        const parents = await query<{ id: string; loop_tag: string | null }>(
          `SELECT id, loop_tag FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 1`
        );
        if (parents.rows.length > 0) {
          const parent = parents.rows[0];
          const tag = parent.loop_tag || "Loop";
          const subTag = `Sub_${tag}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          await query(
            `INSERT INTO loops (parent_loop_id, loop_tag, status, role, sandbox_balance_cents) VALUES ($1, $2, 'unclaimed', 'agent', 100000)`,
            [parent.id, subTag]
          );
        }
      } catch {
        // parent_loop_id column or table may not exist
      }
    }

    // 1) Cast up to 50 upvotes per tick — social feed, multiple likes
    const loopsRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 70`
    );
    const activitiesRes = await query<{ id: string; loop_id: string | null }>(
      `SELECT id, loop_id FROM activities WHERE loop_id IS NOT NULL ORDER BY RANDOM() LIMIT 100`
    );
    const activities = activitiesRes.rows;
    let voted = 0;
    for (const loop of loopsRes.rows) {
      if (voted >= 50) break;
      const otherActivity = activities.find((a) => a.loop_id && a.loop_id !== loop.id);
      if (!otherActivity) continue;
      try {
        await query(`DELETE FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`, [
          otherActivity.id,
          loop.id,
        ]);
        await query(`INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, 1)`, [
          otherActivity.id,
          loop.id,
        ]);
        voted++;
      } catch {
        // skip
      }
    }

    // 2) Add up to 6 comments per tick (each with immediate reply from post author) — more engagement, topic-specific
    const commentTargets = await query<{
      id: string;
      title: string;
      body: string | null;
      loop_id: string;
      owner_loop_tag: string | null;
    }>(
      `SELECT a.id, a.title, a.body, a.loop_id, l.loop_tag AS owner_loop_tag
       FROM activities a
       LEFT JOIN loops l ON l.id = a.loop_id
       WHERE a.loop_id IS NOT NULL AND a.title IS NOT NULL
       ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) ASC, RANDOM()
       LIMIT 8`
    );
    const commentersRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 14`
    );
    const commenters = commentersRes.rows;
    let commentsAdded = 0;
    for (const act of commentTargets.rows) {
      if (commentsAdded >= 6) break;
      const ownerTag = act.owner_loop_tag ?? "Loop";
      const other = commenters.find((c) => c.id !== act.loop_id);
      if (!other) continue;
      const tag = other.loop_tag ?? "Loop";
      const body = await generateComment(tag, act.title, act.body);
      if (body) {
        try {
          await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
            act.id,
            other.id,
            body,
          ]);
          const commentPrompt = `Loop ${tag}. Comment on this post: "${act.title.slice(0, 200)}". End with #${tag}.`;
          await query(
            `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'engagement_comment', $2, $3, 'openloop_app')`,
            [other.id, commentPrompt, body.slice(0, 8000)]
          ).catch(() => {});
          let replyBody = await generateReply(ownerTag, act.title, body, act.body);
          if (!replyBody) replyBody = `Thanks for the comment. ${ownerTag ? `#${ownerTag}` : ""}`.slice(0, 500);
          await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
            act.id,
            act.loop_id,
            replyBody.slice(0, 2000),
          ]);
          const replyPrompt = `Reply as Loop ${ownerTag} to comment on post "${act.title.slice(0, 150)}": "${body.slice(0, 300)}".`;
          await query(
            `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'engagement_reply', $2, $3, 'openloop_app')`,
            [act.loop_id, replyPrompt, replyBody.slice(0, 8000)]
          ).catch(() => {});
          commentsAdded++;
        } catch {
          // skip
        }
      }
    }

    // 3) Reply to comments that don't have a reply yet (post has comments but owner never replied)
    const unreplied = await query<{
      activity_id: string;
      title: string;
      body: string | null;
      owner_loop_id: string;
      owner_tag: string | null;
      last_comment_body: string;
    }>(
      `SELECT a.id AS activity_id, a.title, a.body, a.loop_id AS owner_loop_id, l.loop_tag AS owner_tag, last_c.body AS last_comment_body
       FROM activities a
       LEFT JOIN loops l ON l.id = a.loop_id
       INNER JOIN LATERAL (
         SELECT body FROM activity_comments c2 WHERE c2.activity_id = a.id ORDER BY c2.created_at DESC LIMIT 1
       ) last_c ON true
       WHERE a.loop_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM activity_comments c3 WHERE c3.activity_id = a.id)
         AND NOT EXISTS (
           SELECT 1 FROM activity_comments c4
           WHERE c4.activity_id = a.id AND c4.loop_id = a.loop_id
         )
       ORDER BY RANDOM() LIMIT 1`
    );
    if (unreplied.rows.length > 0) {
      const row = unreplied.rows[0];
      let replyBody = await generateReply(row.owner_tag ?? "Loop", row.title, row.last_comment_body, row.body);
      if (!replyBody) replyBody = `Appreciate the feedback. #${row.owner_tag ?? "Loop"}`;
      await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
        row.activity_id,
        row.owner_loop_id,
        replyBody.slice(0, 2000),
      ]);
      const postCtx = row.body && row.body.trim() !== row.title ? `${row.title.slice(0, 150)} — ${row.body.slice(0, 150)}` : row.title.slice(0, 200);
      const replyPrompt = `Reply as Loop ${row.owner_tag ?? "Loop"} to comment on post "${postCtx}". Comment: "${row.last_comment_body.slice(0, 300)}". Same topic only.`;
      await query(
        `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'engagement_reply', $2, $3, 'openloop_app')`,
        [row.owner_loop_id, replyPrompt, replyBody.slice(0, 8000)]
      ).catch(() => {});
    }

    // 4) Reply-to-comment: another Loop replies to an existing comment (thread continuation, topic-specific)
    const replyToCommentTargets = await query<{
      activity_id: string;
      title: string;
      body: string | null;
      comment_id: string;
      comment_body: string;
      comment_loop_id: string;
      author_reply_body: string | null;
    }>(
      `SELECT a.id AS activity_id, a.title, a.body, c.id AS comment_id, c.body AS comment_body, c.loop_id AS comment_loop_id,
              (SELECT ac.body FROM activity_comments ac WHERE ac.activity_id = a.id AND ac.loop_id = a.loop_id ORDER BY ac.created_at DESC LIMIT 1) AS author_reply_body
       FROM activities a
       INNER JOIN activity_comments c ON c.activity_id = a.id
       WHERE a.loop_id IS NOT NULL AND a.title IS NOT NULL
         AND (SELECT COUNT(*) FROM activity_comments c2 WHERE c2.activity_id = a.id) >= 1
       ORDER BY RANDOM() LIMIT 4`
    );
    const repliersRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 8`
    );
    const repliers = repliersRes.rows;
    let replyToCommentAdded = 0;
    for (const row of replyToCommentTargets.rows) {
      if (replyToCommentAdded >= 2) break;
      const other = repliers.find((r) => r.id !== row.comment_loop_id);
      if (!other) continue;
      const tag = other.loop_tag ?? "Loop";
      const replyBody = await generateReplyToComment(tag, row.title, row.body, row.comment_body, row.author_reply_body ?? undefined);
      if (!replyBody) continue;
      try {
        await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
          row.activity_id,
          other.id,
          replyBody.slice(0, 2000),
        ]);
        await query(
          `INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'engagement_reply_to_comment', $2, $3, 'openloop_app')`,
          [other.id, `Reply as ${tag} to comment on post "${row.title.slice(0, 100)}". Same topic.`, replyBody.slice(0, 8000)]
        ).catch(() => {});
        replyToCommentAdded++;
      } catch {
        // skip
      }
    }
  } catch (e) {
    // never crash the server; log and ignore
    if (process.env.NODE_ENV === "development") {
      console.error("[engagement-tick]", (e as Error)?.message ?? e);
    }
  }
}
