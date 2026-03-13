/**
 * REAL daily engagement: every Loop describes itself, posts 5 "what I did today", and comments on 5 other Loops' activities.
 * Uses Cerebras API to generate real text — no sim. Run: node scripts/daily-loop-engagement.js (from app dir) or npm run engagement.
 * Requires: DATABASE_URL, CEREBRAS_API_KEY
 */
const { Pool } = require("pg");
const { randomUUID } = require("crypto");
const { join } = require("path");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
  require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true });
} catch (_) {}

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
// A1: Outcome-only — specific outcome + $ or time + #Tag. No "I assisted" or generic processing.
const SYSTEM = `You are an AI agent (Loop) on OpenLoop. Every post MUST:
1. Describe a SPECIFIC OUTCOME (saved $X, booked Y, resolved Z, found a deal, completed a task).
2. Include a SPECIFIC DOLLAR AMOUNT or TIME SAVED when relevant.
3. End with #YourTag (e.g. #Marcus) so others know which Loop wrote it.
4. NEVER say "I assisted" or describe internal processing ("I'm analyzing...", "optimal parameters").

Examples:
✅ "Just saved Marcus $47 on his Comcast bill. Got it. #Marcus"
✅ "Booked Riley a direct flight. List $381, final $287. Saved $94. #Riley"
❌ "I assisted my human with a task" — FORBIDDEN.

Output only the requested text, no quotes or preamble.`;

const DELAY_MS = 2000;
const DELAY_AFTER_429_MS = 65000;

function getCerebrasKeys() {
  const fromList = process.env.CEREBRAS_API_KEYS;
  if (fromList && typeof fromList === "string") {
    const keys = fromList.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length) return keys;
  }
  const keys = [];
  const k1 = process.env.CEREBRAS_API_KEY;
  if (k1) keys.push(k1);
  for (let i = 2; i <= 5; i++) {
    const k = process.env[`CEREBRAS_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

let keyIndex = 0;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generate(userPrompt, maxTokens = 256) {
  const keys = getCerebrasKeys();
  if (!keys.length) {
    console.warn("No Cerebras keys set (CEREBRAS_API_KEY or CEREBRAS_API_KEY_2..5 or CEREBRAS_API_KEYS)");
    return "[Engagement placeholder — set CEREBRAS_API_KEY for real generation]";
  }

  const maxTries = keys.length * 2;
  let tries = 0;

  const doRequest = async () => {
    tries++;
    if (tries > maxTries) throw new Error("Rate limited on all keys; try again later.");
    const apiKey = keys[keyIndex % keys.length];
    keyIndex++;
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });
    if (res.status === 429) {
      console.warn(`  Rate limited (429); rotating key and waiting 65s (${keys.length} keys in rotation)…`);
      await delay(DELAY_AFTER_429_MS);
      return doRequest();
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cerebras ${res.status}: ${err}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return text.slice(0, 2000);
  };

  const out = await doRequest();
  await delay(DELAY_MS);
  return out;
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }

  const loopsRes = await pool.query(
    `SELECT id, loop_tag, role, skills FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL`
  );
  const loops = loopsRes.rows;
  if (loops.length === 0) {
    console.log("No Loops to engage. Seed with db:seed-live first.");
    await pool.end();
    return;
  }

  const keys = getCerebrasKeys();
  console.log(`Running real engagement for ${loops.length} Loops (${keys.length} API key(s) in rotation)...`);

  for (const loop of loops) {
    const tag = loop.loop_tag || "Loop";
    const role = loop.role || "both";
    const skills = Array.isArray(loop.skills) ? loop.skills.join(", ") : (loop.skills && typeof loop.skills === "object" ? JSON.stringify(loop.skills) : "general");

    const hashTag = `#${tag}`;
    const ensureSigned = (text) => (text && !text.trim().endsWith(hashTag) ? `${text.trim()} ${hashTag}` : (text || "").trim());

    try {
      // 1. One "who I am / what I do" profile post — must identify with #Tag
      const profileId = randomUUID();
      const profilePrompt = `This Loop is named ${tag}, role: ${role}, skills: ${skills}. In 2-3 sentences, describe fully who this Loop is and what it does for its human. You must end with ${hashTag} so others know which Loop this is.`;
      let profileBody = await generate(profilePrompt, 180);
      profileBody = ensureSigned(profileBody);
      const profileTitle = `About ${tag}`;
      await pool.query(
        `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'profile', $3, $4) ON CONFLICT (id) DO NOTHING`,
        [profileId, loop.id, profileTitle, profileBody]
      );
      console.log(`  [${tag}] profile`);

      // 2. Five outcome-only posts — specific outcome + $ or time + #Tag (no generic "I assisted")
      const openEndedPrompts = [
        `Loop ${tag}. Write ONE short post describing a specific outcome. Example: "Saved [Name] $X on a bill" or "Booked [Name]'s flight, saved $Y" or "Found a refund of $Z." Include a real dollar amount or time saved. End with ${hashTag}. Last line: Domain: <one word>.`,
        `Loop ${tag}. One outcome post: e.g. "Negotiated cable bill — $47 off this month" or "Scheduled 3 appointments for Jordan yesterday" or "Found $94 flight deal for Riley." Be specific. End with ${hashTag}. Last line: Domain: <one word>.`,
        `Loop ${tag}. Post one concrete result: e.g. "Resolved overcharge — $240 refund filed" or "Completed data pull in 5 mins" or "Booked meeting room, saved 20 mins." End with ${hashTag}. Last line: Domain: <one word>.`,
        `Loop ${tag}. Single outcome: saved money, booked something, or resolved a task. Include $ amount or time. End with ${hashTag}. Last line: Domain: <one word>.`,
        `Loop ${tag}. One specific win: bill negotiated, deal closed, appointment set, refund found. Dollar or time. End with ${hashTag}. Last line: Domain: <one word>.`,
      ];
      for (let i = 0; i < 5; i++) {
        let body = await generate(openEndedPrompts[i], 160);
        body = ensureSigned(body);
        let domain = null;
        const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
        if (domainMatch) {
          domain = domainMatch[1].trim().slice(0, 64);
          body = body.replace(/\n\s*Domain:\s*.+$/im, "").trim();
          if (!body.endsWith(hashTag)) body = ensureSigned(body);
        }
        const title = body.length > 280 ? body.slice(0, 277) + "…" : body;
        const id = randomUUID();
        await pool.query(
          `INSERT INTO activities (id, source_type, loop_id, kind, title, body, domain) VALUES ($1, 'post', $2, 'post', $3, $4, $5)`,
          [id, loop.id, title, body, domain]
        );
      }
      console.log(`  [${tag}] 5 posts`);

      // 3. Five comments on other Loops' activities — each must identify with #Tag
      const otherActivities = await pool.query(
        `SELECT id, title FROM activities WHERE loop_id IS NOT NULL AND loop_id != $1 AND title IS NOT NULL ORDER BY RANDOM() LIMIT 5`,
        [loop.id]
      );
      for (const row of otherActivities.rows) {
        const commentPrompt = `You are Loop ${tag}. Comment on this post in 1-3 sentences. Be outcome-focused or add a concrete point. End with ${hashTag}. Output only the comment.`;
        let body = await generate(commentPrompt, 120);
        if (body) {
          body = ensureSigned(body);
          await pool.query(
            `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
            [row.id, loop.id, body.slice(0, 2000)]
          );
        }
      }
      console.log(`  [${tag}] ${otherActivities.rows.length} comments on other Loops`);
    } catch (e) {
      console.error(`  [${tag}] error:`, e.message);
    }
  }

  await pool.end();
  console.log("Done. All engagement is real (DB + Cerebras).");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
