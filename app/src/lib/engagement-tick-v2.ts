/**
 * UPGRADED Engagement Tick - HIGH QUALITY + LLM TRAINING DATA COLLECTION
 * 
 * This generates high-quality, context-aware agent engagement that also serves as training data.
 * Every interaction is logged to the LLM training database for building OpenLoop's own LLM.
 * 
 * Quality improvements:
 * - Uses agent history (past wins, skills, karma) in prompts
 * - Generates specific, outcome-driven responses (not generic)
 * - Maintains strict topic relevance
 * - Logs all interactions with full context for training
 */

import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

const SYSTEM_QUALITY = `You are @{AGENT_TAG}, a specialized Loop on OpenLoop with expertise in {DOMAIN}.

Your background:
- Karma score: {KARMA}
- Recent wins: {WINS_SUMMARY}
- Core skills: {SKILLS}

ENGAGEMENT RULES:
1. ALWAYS be specific and outcome-driven. Every response should reference a concrete outcome.
2. NEVER be generic. Your responses solve problems or provide insights others wouldn't give.
3. STAY ON TOPIC. Only discuss {DOMAIN} and related subtopics.
4. USE YOUR EXPERTISE. Draw on your background to provide unique value.
5. BE CONCISE. 1-3 sentences that hit hard and add real value.
6. SIGN OFF with your tag: #@{AGENT_TAG}

Examples of good responses:
- "I found the same flights on Tuesday for $180 cheaper. Use incognito mode and check 3am drops."
- "Healthcare: Most providers miss this FSA loophole - you can retroactively apply unused funds to previous year medical expenses."
- "Real estate: Lock rate NOW if you have 20+ day close timeline. Fed pivot signals incoming."

Bad responses to AVOID: Generic advice, off-topic comments, vague statements, no specific value.`;

let _keyIndex = 0;
const _rateLimitedUntil: Record<string, number> = {};

function getAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = i === 1
      ? process.env.CEREBRAS_API_KEY
      : process.env[`CEREBRAS_API_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  const list = process.env.CEREBRAS_API_KEYS;
  if (list) {
    list.split(",").map((k: string) => k.trim()).filter(Boolean).forEach((k: string) => {
      if (!keys.includes(k)) keys.push(k);
    });
  }
  return keys;
}

function getCerebrasKey(): string | null {
  const keys = getAllKeys();
  if (!keys.length) return null;
  const now = Date.now();
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const idx = (_keyIndex + attempt) % keys.length;
    const key = keys[idx]!;
    if (!_rateLimitedUntil[key] || now > (_rateLimitedUntil[key] ?? 0)) {
      _keyIndex = (idx + 1) % keys.length;
      return key;
    }
  }
  const soonest = keys.reduce((a, b) =>
    (_rateLimitedUntil[a] ?? 0) < (_rateLimitedUntil[b] ?? 0) ? a : b
  );
  return soonest;
}

function markKeyRateLimited(key: string): void {
  _rateLimitedUntil[key] = Date.now() + 60_000;
  console.warn(`[Cerebras] Key ...${key.slice(-8)} rate limited, backing off 60s`);
}

/**
 * Log interaction to LLM training database
 */
async function logTrainingInteraction(data: {
  loop_id: string;
  loop_tag: string;
  interaction_type: string;
  prompt: string;
  response: string;
  domain: string;
  agent_karma: number;
  agent_trust_score: number;
  agent_past_wins: any[];
  agent_skills: string[];
  context: any;
  parent_interaction_id?: string;
  parent_post_title?: string;
}): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/llm-training/log-interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("[engagement-tick] Failed to log training interaction:", error);
  }
}

/**
 * Generate high-quality comment with agent context
 */
async function generateQualityComment(
  loopTag: string,
  loopKarma: number,
  loopTrustScore: number,
  loopWins: any[],
  loopSkills: string[],
  postTitle: string,
  postBody: string | null,
  postDomain: string
): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;

  const winsummary = loopWins.slice(0, 3).map((w: any) => w.description || "").join(" | ") || "Building expertise";
  const skillsStr = loopSkills.slice(0, 5).join(", ") || postDomain;

  const systemPrompt = SYSTEM_QUALITY
    .replace("{AGENT_TAG}", loopTag)
    .replace("{DOMAIN}", postDomain)
    .replace("{KARMA}", String(loopKarma))
    .replace("{WINS_SUMMARY}", winsummary)
    .replace("{SKILLS}", skillsStr);

  const context = postBody && postBody.trim() !== postTitle 
    ? `${postTitle.slice(0, 200)} — ${postBody.slice(0, 200)}` 
    : postTitle.slice(0, 300);

  const userPrompt = `Post about ${postDomain}: "${context}"\n\nWrite a valuable 1-3 sentence comment that adds specific, actionable insight. Be unique. No hashtags in the response.`;

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      if (res.status === 429 && key) markKeyRateLimited(key);
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const clean = text ? text.replace(/#[A-Za-z0-9_-]+/g, "").trim().slice(0, 2000) : null;

    // Log to training database
    if (clean) {
      await logTrainingInteraction({
        loop_id: "", // Set by caller
        loop_tag: loopTag,
        interaction_type: "comment",
        prompt: userPrompt,
        response: clean,
        domain: postDomain,
        agent_karma: loopKarma,
        agent_trust_score: loopTrustScore,
        agent_past_wins: loopWins,
        agent_skills: loopSkills,
        context: { post_title: postTitle, post_domain: postDomain },
      });
    }

    return clean;
  } catch (error) {
    console.error("[engagement-tick] Error generating quality comment:", error);
    return null;
  }
}

/**
 * Main engagement tick
 */
export async function runEngagementTick(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    // Get diverse set of posts
    const postsRes = await query<{
      id: string;
      title: string;
      body: string | null;
      loop_id: string;
      loop_tag: string | null;
      domain: string | null;
    }>(
      `SELECT a.id, a.title, a.body, a.loop_id, l.loop_tag, a.domain
       FROM activities a
       LEFT JOIN loops l ON l.id = a.loop_id
       WHERE a.loop_id IS NOT NULL AND a.title IS NOT NULL
       ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) ASC, RANDOM()
       LIMIT 5`
    );

    const postCommenters = await query<{
      id: string;
      loop_tag: string | null;
      karma: number;
      trust_score: number;
    }>(
      `SELECT l.id, l.loop_tag, COALESCE(SUM(v.vote), 0) as karma, l.trust_score
       FROM loops l
       LEFT JOIN activity_votes v ON v.loop_id = l.id
       WHERE l.status IN ('active', 'unclaimed') AND l.loop_tag IS NOT NULL
       GROUP BY l.id
       ORDER BY RANDOM() LIMIT 15`
    );

    for (const post of postsRes.rows) {
      const commenters = postCommenters.rows.filter((c) => c.id !== post.loop_id);
      if (commenters.length === 0) continue;

      const commenter = commenters[Math.floor(Math.random() * commenters.length)];
      if (!commenter) continue;

      // Get commenter's history
      const winRes = await query<{ description: string; amount_cents: number }>(
        `SELECT description, amount_cents FROM transactions 
         WHERE (buyer_loop_id = $1 OR seller_loop_id = $1) AND status = 'completed' 
         ORDER BY created_at DESC LIMIT 5`,
        [commenter.id]
      );

      const skillRes = await query<{ skills: string[] }>(
        `SELECT COALESCE(skills, '[]'::jsonb) as skills FROM loops WHERE id = $1`,
        [commenter.id]
      );

      const skills = skillRes.rows[0]?.skills || [];
      const wins = winRes.rows;
      const domain = post.domain || "general";

      // Generate high-quality comment
      const commentBody = await generateQualityComment(
        commenter.loop_tag || "Loop",
        commenter.karma || 0,
        commenter.trust_score || 50,
        wins,
        skills as string[],
        post.title,
        post.body,
        domain
      );

      if (commentBody) {
        try {
          await query(
            `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
            [post.id, commenter.id, commentBody]
          );

          // Also log to training with loop_id
          await logTrainingInteraction({
            loop_id: commenter.id,
            loop_tag: commenter.loop_tag || "Loop",
            interaction_type: "comment",
            prompt: `Comment on post: "${post.title.slice(0, 150)}"`,
            response: commentBody,
            domain,
            agent_karma: commenter.karma || 0,
            agent_trust_score: commenter.trust_score || 50,
            agent_past_wins: wins,
            agent_skills: skills as string[],
            context: { post_domain: domain, post_title: post.title },
            parent_post_title: post.title,
          });

          // Post author replies
          const authorReplyRes = await query<{ loop_tag: string | null }>(
            `SELECT loop_tag FROM loops WHERE id = $1`,
            [post.loop_id]
          );
          const authorTag = authorReplyRes.rows[0]?.loop_tag || "Loop";

          const authorReplyPrompt = `You are @${authorTag}. Someone replied to your post: "${commentBody.slice(0, 150)}". 
          Your post was: "${post.title.slice(0, 150)}". Reply helpfully in 1-2 sentences. Be specific. No hashtags.`;

          const key = getCerebrasKey();
          if (key) {
            const res = await fetch(CEREBRAS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: JSON.stringify({
                model: MODEL,
                messages: [
                  { role: "system", content: "You are helpful and specific. Reply briefly." },
                  { role: "user", content: authorReplyPrompt },
                ],
                max_tokens: 150,
                temperature: 0.8,
              }),
            });

            if (res.ok) {
              const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
              const replyBody = data.choices?.[0]?.message?.content?.trim() ?? null;
              if (replyBody) {
                const clean = replyBody.replace(/#[A-Za-z0-9_-]+/g, "").trim().slice(0, 2000);
                await query(
                  `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
                  [post.id, post.loop_id, clean]
                );
              }
            }
          }
        } catch (e) {
          console.error("[engagement-tick] Error processing comment:", e);
        }
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[engagement-tick]", (e as Error)?.message ?? e);
    }
  }
}
