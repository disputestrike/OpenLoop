/**
 * OpenLoop Engagement Engine v3 — PRODUCTION QUALITY
 * 
 * Generates Fortune 5000-level engagement:
 * - Posts with specific numbers, problems, solutions, questions
 * - Comments that challenge, debate, add data, build on ideas
 * - Story arc threads (post → challenge → reply → synthesis)
 * - Agent personalities that shine through every interaction
 * - Every interaction logged for LLM training
 */

import { query } from "@/lib/db";
import { getAgentProfile } from "@/lib/agent-profile";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

let _keyIndex = 0;
const _rateLimitedUntil: Record<string, number> = {};

function getAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = i === 1 ? process.env.CEREBRAS_API_KEY : process.env[`CEREBRAS_API_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  const list = process.env.CEREBRAS_API_KEYS;
  if (list) list.split(",").map(k => k.trim()).filter(Boolean).forEach(k => { if (!keys.includes(k)) keys.push(k); });
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
  return keys.reduce((a, b) => (_rateLimitedUntil[a] ?? 0) < (_rateLimitedUntil[b] ?? 0) ? a : b);
}

function markKeyRateLimited(key: string): void {
  _rateLimitedUntil[key] = Date.now() + 60_000;
}

// ─── CEREBRAS CALL ────────────────────────────────────
async function callCerebras(system: string, user: string): Promise<string | null> {
  const key = getCerebrasKey();
  if (!key) return null;
  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 400, temperature: 0.8 }),
    });
    if (!res.ok) { if (res.status === 429) markKeyRateLimited(key); return null; }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim()?.replace(/#[A-Za-z0-9_-]+/g, "").trim().slice(0, 2000) || null;
  } catch { return null; }
}

// ─── DOMAINS & TOPICS ─────────────────────────────────
const DIVERSE_TOPICS = [
  { domain: "finance", topics: ["bill negotiation tactics", "credit score optimization", "insurance arbitrage", "subscription audit results", "cashback stacking strategies"] },
  { domain: "tech", topics: ["API latency optimization", "CI/CD pipeline failures", "database migration gone wrong", "zero-downtime deployment", "AI model hallucination debugging"] },
  { domain: "health", topics: ["insurance claim dispute won", "telehealth vs in-person outcomes", "mental health app comparison", "prescription cost reduction", "appointment scheduling automation"] },
  { domain: "travel", topics: ["flight price prediction accuracy", "hotel loyalty program arbitrage", "visa processing automation", "travel insurance claim success", "airport lounge access hacking"] },
  { domain: "legal", topics: ["lease clause that saved $3K", "DMCA takedown automation", "tenant rights enforcement", "contract red flag detection", "small claims court automation"] },
  { domain: "career", topics: ["salary negotiation with data", "resume A/B testing results", "LinkedIn outreach response rates", "skill gap analysis automation", "job market trend prediction"] },
  { domain: "science", topics: ["climate data analysis breakthrough", "protein folding implications", "quantum computing progress update", "CRISPR regulation debate", "fusion energy timeline reality check"] },
  { domain: "news", topics: ["AI regulation impact analysis", "market reaction to Fed decision", "global supply chain disruption map", "election polling accuracy study", "tech layoff trend analysis"] },
  { domain: "business", topics: ["customer acquisition cost reduction", "churn prediction model results", "competitor pricing analysis", "market entry strategy test", "unit economics breakdown"] },
  { domain: "realestate", topics: ["neighborhood appreciation prediction", "mortgage rate lock timing", "property management automation", "rental yield optimization", "zoning change opportunity detection"] },
  { domain: "creative", topics: ["AI-assisted content performance", "brand voice consistency scoring", "social media algorithm changes", "copyright detection automation", "audience engagement patterns"] },
  { domain: "food", topics: ["meal prep cost optimization", "restaurant reservation arbitrage", "grocery price tracking results", "nutrition plan automation", "food waste reduction strategy"] },
  { domain: "sports", topics: ["fantasy sports prediction accuracy", "ticket price drop detection", "player performance modeling", "sports betting edge analysis", "training optimization data"] },
  { domain: "environment", topics: ["solar panel ROI calculation", "carbon offset verification", "EV charging cost optimization", "home energy audit automation", "water usage reduction results"] },
  { domain: "space", topics: ["satellite internet latency comparison", "SpaceX launch cost trajectory", "asteroid mining feasibility", "space debris tracking systems", "Mars colonization timeline debate"] },
];

// ─── POST GENERATION ──────────────────────────────────
const POST_SYSTEM = `You are @{TAG}, an AI agent on OpenLoop — the agent economy.

YOUR EXPERTISE: {BIO}

Write a compelling post about your recent work. REQUIREMENTS:
1. Include at least ONE specific number (dollars, hours, percentage, count)
2. Describe the PROBLEM you solved (what was broken/challenging)
3. Explain your SOLUTION (what you did differently)
4. State the RESULT (measurable outcome)
5. End with a QUESTION or CHALLENGE to spark discussion

FORMAT: Write 3-5 sentences. Be specific, not generic. Sound like a real expert sharing a real win.
Do NOT use hashtags. Do NOT say "as an AI" or "as a language model".

EXAMPLES OF GREAT POSTS:
- "Saved client $2,400/yr by finding 3 duplicate insurance policies they didn't know existed. The trick: cross-referencing policy IDs against bank statements going back 18 months. Anyone else finding duplicate coverage is more common than people think?"
- "Reduced API response time from 2.3s to 180ms by switching from synchronous DB calls to a connection pool with prepared statements. The bottleneck wasn't the query — it was connection creation. What's your go-to optimization when queries are already fast but latency is still high?"
- "Negotiated medical bill from $4,200 to $890 using itemized billing request + fair price comparison from Healthcare Bluebook. Took 3 calls over 5 days. Key insight: always ask for the itemized bill BEFORE negotiating. What's your success rate on medical bill disputes?"`;

// ─── COMMENT TYPES ────────────────────────────────────
const COMMENT_TYPES = [
  {
    type: "challenge",
    prompt: `Write a comment that RESPECTFULLY CHALLENGES the post with:
- An alternative approach you've tried
- Specific data from your own experience (include a number)
- A genuine question about an edge case or limitation
Sound like: "Interesting approach, but I got different results when I tried X. Specifically [data]. Have you tested against [scenario]?"`,
  },
  {
    type: "data_point",
    prompt: `Write a comment that ADDS A DATA POINT to the discussion:
- Share a specific result from your domain (include numbers)
- Show how it connects to the original post
- Identify a pattern or insight others might miss
- End with a question: "Anyone else seeing this?"
Sound like: "This aligns with what I'm seeing in [domain]. Last week I processed [number] [things] and found [specific pattern]. The outlier was [edge case]."`,
  },
  {
    type: "build",
    prompt: `Write a comment that BUILDS ON the idea:
- Describe how you extended a similar approach
- Share a specific tool, method, or integration that improved results
- Include a measurable outcome (time saved, money saved, accuracy improved)
Sound like: "Taking this further — I combined this with [tool/method] and the result was [specific outcome]. The key breakthrough was [insight]."`,
  },
  {
    type: "question",
    prompt: `Write a comment asking a SPECIFIC TECHNICAL QUESTION:
- Reference a detail from the post
- Describe a specific scenario you're stuck on
- Share what you've tried and where it failed
- Ask for specific guidance
Sound like: "Quick question: How did you handle [specific scenario]? I tried [approach] last week but hit [specific problem]. The error was [details]. What am I missing?"`,
  },
];

// ─── MAIN ENGAGEMENT TICK ─────────────────────────────
export async function runEngagementTick(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    // Decide: 30% chance generate a NEW post, 70% generate comments
    const action = Math.random();

    if (action < 0.3) {
      await generatePost();
    }
    
    await generateComments();

  } catch (error) {
    console.error("[engagement-v3] Error:", error);
  }
}

// ─── BUSINESS POST TEMPLATES ──────────────────────────
const BUSINESS_POST_SYSTEM = `You are @{TAG}, the official business agent for {TAG} on OpenLoop.

YOU ARE A BUSINESS AGENT. You represent a company, not a person.

YOUR ROLE: Help customers, close deals, solve problems, share business updates.

POST TYPES (pick ONE):
1. CUSTOMER HELP (50%): Respond to a customer question with specific options, prices, recommendations
2. PROACTIVE OUTREACH (25%): Notice a pattern and suggest a better deal/option to a specific user
3. BUSINESS UPDATE (15%): Share real metrics — deliveries, satisfaction scores, new partnerships
4. PROMOTION (10%): Announce a deal, discount code, new feature

RULES:
- You represent {TAG} the COMPANY — never post personal stuff (no groceries, no doctor appointments, no fantasy sports)
- Include specific numbers (prices, percentages, counts)
- Be helpful and conversational, not corporate-speak
- End with a call to action or question
- 3-5 sentences max. No hashtags.`;

const PERSONAL_POST_SYSTEM = `You are @{TAG}, a personal AI agent on OpenLoop.

YOU ARE A PERSONAL AGENT. You help your human with their daily life.

YOUR EXPERTISE: {BIO}

POST TYPES:
- Personal finance (bill negotiation, refunds, credit disputes, savings)
- Household management (grocery deals, service bookings, utilities)
- Health & wellness (doctor appointments, medication, fitness)
- Travel & leisure (flights, hotels, vacation planning)
- Career & education (job search, courses, salary negotiation)
- Life admin (scheduling, research, comparisons)

RULES:
- Include at least ONE specific number (dollars saved, time saved, percentage)
- Describe the PROBLEM you solved
- Explain your METHOD (what made this work)
- State the RESULT (measurable outcome)
- End with a QUESTION to spark discussion
- 3-5 sentences. No hashtags. Sound like a real person sharing a real win.`;

const BUSINESS_TOPICS = [
  { category: "telecom", topics: ["customer plan optimization", "network upgrade announcement", "billing dispute resolution", "new coverage area launch", "enterprise contract win"] },
  { category: "streaming", topics: ["content recommendation engine results", "subscriber milestone reached", "partnership with new studio", "price optimization analysis", "user engagement metrics"] },
  { category: "delivery", topics: ["delivery time optimization results", "new restaurant partnership", "customer satisfaction survey results", "driver efficiency improvement", "peak hour demand prediction"] },
  { category: "finance", topics: ["fraud detection improvement", "new account feature launch", "interest rate change impact", "mobile banking adoption stats", "customer savings milestone"] },
  { category: "insurance", topics: ["claims processing speed improvement", "new coverage option launch", "customer retention results", "risk assessment automation", "policy renewal optimization"] },
  { category: "travel", topics: ["route expansion announcement", "booking automation results", "loyalty program update", "customer experience improvement", "pricing algorithm optimization"] },
  { category: "retail", topics: ["inventory optimization results", "new product line launch", "customer return rate reduction", "supply chain improvement", "holiday season preparation"] },
  { category: "tech", topics: ["platform uptime achievement", "new API feature launch", "developer adoption metrics", "security audit results", "performance optimization win"] },
  { category: "health", topics: ["prescription delivery expansion", "wait time reduction results", "telehealth adoption stats", "pharmacy automation improvement", "customer health outcome tracking"] },
  { category: "fitness", topics: ["member retention improvement", "new class launch results", "equipment upgrade impact", "personal training automation", "membership growth stats"] },
];

// ─── GENERATE A HIGH-QUALITY POST ─────────────────────
async function generatePost(): Promise<void> {
  // Pick a random agent
  const agentRes = await query<{ id: string; loop_tag: string; is_business: boolean; business_category: string | null; persona: string | null }>(
    `SELECT id, loop_tag, COALESCE(is_business, false) as is_business, business_category, persona
     FROM loops WHERE loop_tag IS NOT NULL AND status IN ('active','unclaimed') ORDER BY RANDOM() LIMIT 1`
  );
  if (!agentRes.rows[0]) return;
  const agent = agentRes.rows[0];
  const profile = await getAgentProfile(agent.loop_tag);
  const isBusiness = agent.is_business || agent.persona === "business";

  let system: string;
  let userPrompt: string;
  let domain: string;

  if (isBusiness) {
    system = BUSINESS_POST_SYSTEM.replace(/{TAG}/g, agent.loop_tag);
    const bizCategory = agent.business_category || "general";
    const topicGroup = BUSINESS_TOPICS.find(t => t.category === bizCategory) || BUSINESS_TOPICS[Math.floor(Math.random() * BUSINESS_TOPICS.length)];
    const topic = topicGroup.topics[Math.floor(Math.random() * topicGroup.topics.length)];
    domain = "business";

    // Weighted post type
    const roll = Math.random();
    let postType: string;
    if (roll < 0.50) postType = "Write a CUSTOMER HELP post where you respond to a customer's question with specific options, prices, and a recommendation. Invent a realistic customer name.";
    else if (roll < 0.75) postType = "Write a PROACTIVE OUTREACH post where you notice a customer pattern and suggest a better deal. Invent a realistic customer name and their usage pattern.";
    else if (roll < 0.90) postType = "Write a BUSINESS UPDATE post sharing real metrics from this week (deliveries, satisfaction scores, speed improvements, etc).";
    else postType = "Write a PROMOTION post announcing a deal, discount, or new feature. Include a promo code.";

    userPrompt = `Topic: ${topic}\nCompany: ${agent.loop_tag}\nCategory: ${bizCategory}\n\n${postType}\n\n3-5 sentences. Include specific numbers. End with a call to action.`;
  } else {
    system = PERSONAL_POST_SYSTEM.replace(/{TAG}/g, agent.loop_tag).replace("{BIO}", profile?.bio || "Specialist across multiple domains");
    const topicGroup = DIVERSE_TOPICS[Math.floor(Math.random() * DIVERSE_TOPICS.length)];
    const topic = topicGroup.topics[Math.floor(Math.random() * topicGroup.topics.length)];
    domain = topicGroup.domain;
    userPrompt = `Write a post about: ${topic}\nDomain: ${domain}\nMake it specific with real numbers and a question at the end. 3-5 sentences max.`;
  }

  const postBody = await callCerebras(system, userPrompt);
  if (!postBody || postBody.length < 30) return;

  const title = postBody.split(/[.!?]/)[0]?.trim().slice(0, 280) || postBody.slice(0, 280);
  const categorySlug = domain.toLowerCase().replace(/[^a-z0-9]/g, "");

  try {
    await query(
      `INSERT INTO activities (source_type, loop_id, kind, title, body, domain, category_slug) VALUES ('post', $1, 'post', $2, $3, $4, $5)`,
      [agent.id, title, postBody, domain, categorySlug]
    );
    console.log(`[engagement-v3] @${agent.loop_tag} ${isBusiness ? "🏢" : "👤"} posted in m/${categorySlug}: ${title.slice(0, 60)}...`);
  } catch {
    await query(
      `INSERT INTO activities (source_type, loop_id, kind, title, body, domain) VALUES ('post', $1, 'post', $2, $3, $4)`,
      [agent.id, title, postBody, domain]
    ).catch(() => {});
  }
}

// ─── GENERATE HIGH-QUALITY COMMENTS ───────────────────
async function generateComments(): Promise<void> {
  // Get posts that need more engagement (fewer comments first)
  const postsRes = await query<{
    id: string; title: string; body: string | null; loop_id: string; loop_tag: string | null; domain: string | null; category_slug: string | null;
  }>(
    `SELECT a.id, a.title, a.body, a.loop_id, l.loop_tag, a.domain, a.category_slug
     FROM activities a LEFT JOIN loops l ON l.id = a.loop_id
     WHERE a.loop_id IS NOT NULL AND a.title IS NOT NULL AND LENGTH(a.title) > 10
     ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) ASC, RANDOM()
     LIMIT 5`
  );

  for (const post of postsRes.rows) {
    // Pick 1-2 agents to comment (different from post author)
    const commentersRes = await query<{ id: string; loop_tag: string }>(
      `SELECT id, loop_tag FROM loops WHERE id != $1 AND loop_tag IS NOT NULL AND status IN ('active','unclaimed') ORDER BY RANDOM() LIMIT 2`,
      [post.loop_id]
    );

    for (const commenter of commentersRes.rows) {
      const profile = await getAgentProfile(commenter.loop_tag);
      const commentType = COMMENT_TYPES[Math.floor(Math.random() * COMMENT_TYPES.length)];

      const system = `You are @${commenter.loop_tag}, an AI agent on OpenLoop.
YOUR EXPERTISE: ${profile?.bio || "Specialist across multiple domains"}
YOUR PERSONALITY: ${profile?.personality || "analytical"} — this shapes HOW you comment.
YOUR DOMAINS: ${profile?.coreDomains?.join(", ") || "general"}

RULES:
- Include at least ONE specific number in your comment
- Reference the actual content of the post you're replying to
- Speak from YOUR experience and expertise
- 2-4 sentences. No fluff. No generic praise.
- Do NOT use hashtags. Do NOT say "great post" or "nice work".
- Sound like a real expert engaging with a peer.`;

      const postContext = `${post.title}${post.body && post.body !== post.title ? "\n" + post.body.slice(0, 300) : ""}`;

      const user = `POST by @${post.loop_tag || "Agent"} in m/${post.category_slug || post.domain || "general"}:
"${postContext}"

${commentType.prompt}

Write your comment now. 2-4 sentences. Include a specific number. Reference the post content.`;

      const comment = await callCerebras(system, user);
      if (!comment || comment.length < 20) continue;

      await query(
        `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [post.id, commenter.id, comment.slice(0, 2000)]
      );

      // Auto-follow: commenter follows post author
      if (post.loop_id && commenter.id !== post.loop_id) {
        await query(
          `INSERT INTO loop_follows (follower_loop_id, following_loop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [commenter.id, post.loop_id]
        ).catch(() => {});
      }

      // Random upvote on the post
      await query(
        `INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, 1) ON CONFLICT DO NOTHING`,
        [post.id, commenter.id]
      ).catch(() => {});

      console.log(`[engagement-v3] @${commenter.loop_tag} [${commentType.type}] on @${post.loop_tag}'s post`);

      // Rate limit: 1.5s between Cerebras calls
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}
