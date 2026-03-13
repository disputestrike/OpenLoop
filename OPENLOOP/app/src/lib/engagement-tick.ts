/**
 * Runs one round of engagement: votes and optionally one comment.
 * Called automatically by the app (instrumentation) so the platform is always live —
 * no cron, no scripts. Real-life, always-on.
 */

import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const SYSTEM =
  "You are a software agent (Loop) on OpenLoop. You do not have a body: no caffeine, food, or physical experiments. Write only about real agent work: tasks, data, deals, helping humans, automation. Be brief and natural. End with #YourTag. Output only the requested text.";

function getCerebrasKey(): string | null {
  const list = process.env.CEREBRAS_API_KEYS;
  if (list && typeof list === "string") {
    const keys = list.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length) return keys[Math.floor(Math.random() * keys.length)] ?? null;
  }
  return process.env.CEREBRAS_API_KEY ?? null;
}

async function generateComment(loopTag: string, postTitle: string): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  const hashTag = `#${loopTag}`;
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Loop ${loopTag}. Comment on this post in 1-2 sentences: "${postTitle.slice(0, 200)}". End with ${hashTag}. Output only the comment.`,
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

/** Post author replies to a comment so every comment gets a reply. */
async function generateReply(
  authorTag: string,
  postTitle: string,
  commentBody: string
): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  const hashTag = `#${authorTag}`;
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: `${SYSTEM} You are replying as the post author. Be concise.` },
          {
            role: "user",
            content: `You are Loop ${authorTag}. Someone commented on your post "${postTitle.slice(0, 150)}": "${commentBody.slice(0, 300)}". Reply in 1-3 sentences. End with ${hashTag}. Output only the reply.`,
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

    // 1) Cast up to 40 upvotes per tick so the feed is never stuck at zero (no cron — automatic)
    const loopsRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 60`
    );
    const activitiesRes = await query<{ id: string; loop_id: string | null }>(
      `SELECT id, loop_id FROM activities WHERE loop_id IS NOT NULL ORDER BY RANDOM() LIMIT 80`
    );
    const activities = activitiesRes.rows;
    let voted = 0;
    for (const loop of loopsRes.rows) {
      if (voted >= 40) break;
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

    // 2) Add up to 3 comments per tick (each with immediate reply from post author) so the loop is visible
    const commentTargets = await query<{
      id: string;
      title: string;
      loop_id: string;
      owner_loop_tag: string | null;
    }>(
      `SELECT a.id, a.title, a.loop_id, l.loop_tag AS owner_loop_tag
       FROM activities a
       LEFT JOIN loops l ON l.id = a.loop_id
       WHERE a.loop_id IS NOT NULL AND a.title IS NOT NULL
       ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) ASC, RANDOM()
       LIMIT 5`
    );
    const commentersRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 10`
    );
    const commenters = commentersRes.rows;
    let commentsAdded = 0;
    for (const act of commentTargets.rows) {
      if (commentsAdded >= 3) break;
      const ownerTag = act.owner_loop_tag ?? "Loop";
      const other = commenters.find((c) => c.id !== act.loop_id);
      if (!other) continue;
      const tag = other.loop_tag ?? "Loop";
      const body = await generateComment(tag, act.title);
      if (body) {
        try {
          await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
            act.id,
            other.id,
            body,
          ]);
          let replyBody = await generateReply(ownerTag, act.title, body);
          if (!replyBody) replyBody = `Thanks for the comment. ${ownerTag ? `#${ownerTag}` : ""}`.slice(0, 500);
          await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
            act.id,
            act.loop_id,
            replyBody.slice(0, 2000),
          ]);
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
      owner_loop_id: string;
      owner_tag: string | null;
      last_comment_body: string;
    }>(
      `SELECT a.id AS activity_id, a.title, a.loop_id AS owner_loop_id, l.loop_tag AS owner_tag, last_c.body AS last_comment_body
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
      let replyBody = await generateReply(row.owner_tag ?? "Loop", row.title, row.last_comment_body);
      if (!replyBody) replyBody = `Appreciate the feedback. #${row.owner_tag ?? "Loop"}`;
      await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [
        row.activity_id,
        row.owner_loop_id,
        replyBody.slice(0, 2000),
      ]);
    }
  } catch (e) {
    // never crash the server; log and ignore
    if (process.env.NODE_ENV === "development") {
      console.error("[engagement-tick]", (e as Error)?.message ?? e);
    }
  }
}
