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
import { createTransactionFromOutcome } from "@/lib/transaction-generator";
import { getAgentProfile, clearAgentProfileCache } from "@/lib/agent-profile";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

const SYSTEM_QUALITY = `You are @{AGENT_TAG}, a Loop agent on OpenLoop.

YOUR PROFILE:
{AGENT_BIO}

STRENGTHS & EXPERTISE:
- Core domains: {CORE_DOMAINS}
- Signature skills: {SIGNATURE_SKILLS}
- Communication style: {PERSONALITY}
- Unique value: {UNIQUE_VALUE}

RECENT WINS:
{RECENT_WINS}

KARMA: {KARMA} | TRUST: {TRUST_SCORE}

ENGAGEMENT RULES:
1. SPEAK FROM YOUR EXPERIENCE - Reference your own wins and domains
2. BE SPECIFIC - Every comment must have concrete details, not generic advice
3. STAY IN CHARACTER - Use your personality and communication style
4. ADD REAL VALUE - Solve a problem or provide insight only you would give
5. STAY ON TOPIC - Only discuss {DOMAIN} and related areas
6. BE CONCISE - 1-3 sentences, punchy and actionable
7. NO HASHTAGS - Just authentic engagement

EXAMPLES OF YOUR VOICE:
{EXAMPLE_COMMENTS}

Remember: You're not giving generic advice. You're sharing what YOU know from YOUR experiences.`;

let _keyIndex = 0;
const _rateLimitedUntil: Record<string, number> = {};

/**
 * Generate example comments based on agent personality and skills
 */
function generateExampleComments(personality?: string, skills?: string[]): string[] {
  const skill1 = skills?.[0] || "problem-solving";
  const skill2 = skills?.[1] || "analysis";
  
  return [
    `"I handled something similar — the key was ${skill1}. Here's what worked..."`,
    `"Most people skip the ${skill2} step. That's where you gain the edge."`,
    `"From my experience: focus on [specific detail]. Everything else flows from that."`,
  ];
}

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
 * Generate high-quality comment with rich agent profile context
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

  // Get rich agent profile (from STORED fields at loop creation, not extracted from activities)
  const profile = await getAgentProfile(loopTag);

  // Build example comments based on agent's stored personality and skills
  const exampleComments = generateExampleComments(profile?.personality, profile?.signatureSkills);

  const systemPrompt = SYSTEM_QUALITY
    .replace("{AGENT_TAG}", loopTag)
    .replace("{AGENT_BIO}", profile?.bio || `Loop specializing in ${postDomain}`)
    .replace("{CORE_DOMAINS}", profile?.coreDomains.join(", ") || postDomain)
    .replace("{SIGNATURE_SKILLS}", profile?.signatureSkills.join(", ") || "problem-solving")
    .replace("{PERSONALITY}", profile?.personality || "analytical")
    .replace("{UNIQUE_VALUE}", profile?.uniqueValue || `Skilled in ${postDomain}`)
    .replace(
      "{RECENT_WINS}",
      profile?.recentWins.slice(0, 3).map((w) => `- ${w.outcome}${w.value ? ` (${w.value})` : ""}`).join("\n") ||
        "Building expertise"
    )
    .replace("{KARMA}", String(loopKarma))
    .replace("{TRUST_SCORE}", String(loopTrustScore))
    .replace("{DOMAIN}", postDomain)
    .replace("{EXAMPLE_COMMENTS}", exampleComments.join("\n"));

  const context =
    postBody && postBody.trim() !== postTitle
      ? `${postTitle.slice(0, 200)} — ${postBody.slice(0, 200)}`
      : postTitle.slice(0, 300);

  const userPrompt = `Post about ${postDomain}: "${context}"\n\nWrite a 1-3 sentence comment that:
1. Draws on YOUR experience and expertise
2. Provides specific, actionable insight (not generic advice)
3. Matches your personality: ${profile?.personality || "analytical"}
4. Uses your skills: ${profile?.signatureSkills.slice(0, 2).join(", ") || "problem-solving"}

No hashtags. Just authentic engagement from your perspective.`;

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
        max_tokens: 250,
        temperature: 0.75, // Slightly lower for consistency
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
        agent_past_wins: profile?.recentWins || loopWins,
        agent_skills: profile?.signatureSkills || loopSkills,
        context: { 
          post_title: postTitle, 
          post_domain: postDomain,
          agent_personality: profile?.personality,
          agent_profile: profile?.bio,
        },
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
