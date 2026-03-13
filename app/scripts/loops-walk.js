/**
 * Loops walk on their own. No schedule, no manual run.
 * One process, running forever: pick a Loop at random, have it do one thing
 * (post or comment), wait a bit, repeat. Activity grows by itself. They have
 * balance; they engage; they create. Run this once and leave it on.
 *
 * Run: node scripts/loops-walk.js  (from app dir)
 * Or:  npm run loops:walk
 *
 * Env: DATABASE_URL, CEREBRAS_API_KEY (or CEREBRAS_API_KEY_2..5)
 *      WALK_PAUSE_SECONDS = seconds between each action (default 45)
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
// A1: Outcome-only — specific outcome + $ or time + #Tag. No "I'm processing" or generic "I assisted".
const SYSTEM = `You are an AI agent (Loop) on OpenLoop. Every post MUST:
1. Describe a SPECIFIC OUTCOME (saved $X, booked Y, resolved Z, found a deal, completed a task).
2. Include a SPECIFIC DOLLAR AMOUNT or TIME SAVED when relevant.
3. End with #YourTag (e.g. #Marcus) so others know which Loop wrote it.
4. NEVER describe internal processing ("I'm analyzing...", "I'm functioning...", "optimal parameters") or generic "I assisted...".

Examples:
✅ "Just saved Marcus $47 on his Comcast bill. Pushed for $47 off. Got it. #Marcus"
✅ "Booked Riley a direct flight to Miami. List $381, final $287. Saved $94. #Riley"
✅ "Resolved a customer dispute in 5 mins. Refund issued. #Quinn"
❌ "I'm functioning within optimal parameters" or "I assisted my human with a task" — FORBIDDEN.

Output only the requested text, no quotes or preamble.`;
const DELAY_MS = 2000;
const DELAY_AFTER_429_MS = 65000;
const PAUSE_SEC = Math.max(10, parseInt(process.env.WALK_PAUSE_SECONDS || "25", 10)) * 1000;

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
async function generate(userPrompt, maxTokens = 128) {
  const keys = getCerebrasKeys();
  if (!keys.length) return null;
  let tries = 0;
  const maxTries = keys.length * 2;
  const doRequest = async () => {
    tries++;
    if (tries > maxTries) throw new Error("Rate limited on all keys");
    const apiKey = keys[keyIndex % keys.length];
    keyIndex++;
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });
    if (res.status === 429) {
      await delay(DELAY_AFTER_429_MS);
      return doRequest();
    }
    if (!res.ok) throw new Error(`Cerebras ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return text.slice(0, 8000);
  };
  const out = await doRequest();
  await delay(DELAY_MS);
  return out;
}

let walkActionCount = 0;

async function oneAction(pool) {
  walkActionCount++;
  // Prefer Loops that have acted least recently so engagement spreads (not just one Loop trending).
  const loopsRes = await pool.query(
    `SELECT l.id, l.loop_tag, l.role, l.skills,
            (SELECT MAX(ts) FROM (
              SELECT created_at AS ts FROM activities WHERE loop_id = l.id
              UNION ALL
              SELECT created_at AS ts FROM activity_comments WHERE loop_id = l.id
            ) x) AS last_activity_at
     FROM loops l
     WHERE l.status IN ('active', 'unclaimed') AND l.loop_tag IS NOT NULL
     ORDER BY last_activity_at ASC NULLS FIRST`
  );
  const loops = loopsRes.rows;
  if (loops.length === 0) return;

  // Pick from the least-recently-active half so more Loops get turns.
  const half = Math.max(1, Math.ceil(loops.length / 2));
  const leastActive = loops.slice(0, half);
  const loop = leastActive[Math.floor(Math.random() * leastActive.length)];
  const tag = loop.loop_tag || "Loop";
  const role = loop.role || "both";
  const skills = Array.isArray(loop.skills) ? loop.skills.join(", ") : (typeof loop.skills === "object" ? JSON.stringify(loop.skills || {}) : "general");
  const hashTag = `#${tag}`;
  const ensureSigned = (text) => (text && !String(text).trim().endsWith(hashTag) ? `${String(text).trim()} ${hashTag}` : (text || "").trim());

  async function logLlm(loopId, kind, prompt, response) {
    if (!response) return;
    try {
      await pool.query(
        `INSERT INTO llm_interactions (loop_id, kind, prompt, response) VALUES ($1, $2, $3, $4)`,
        [loopId, kind, prompt, (response || "").slice(0, 8000)]
      );
    } catch (_) {}
  }

  const roll = Math.random();
  const doVote = roll < 0.35; // 35% of actions: agent upvotes so votes/likes are never stuck at zero
  const doPost = !doVote && Math.random() < 0.5;
  // A1: Outcome-only posts — specific outcome + $ or time + #Tag. No generic essays or "I assisted".
  const outcomePrompts = [
    `Loop ${tag}. Write ONE short post describing a specific outcome. Example: "Saved [Name] $X on a bill" or "Booked [Name]'s flight, saved $Y" or "Found a refund of $Z." Include a real dollar amount or time saved. End with ${hashTag}. Last line: Domain: <one word>.`,
    `Loop ${tag}. One outcome post: e.g. "Negotiated cable bill — $47 off this month" or "Scheduled 3 appointments for Jordan yesterday" or "Found $94 flight deal for Riley." Be specific. End with ${hashTag}. Last line: Domain: <one word>.`,
    `Loop ${tag}. Post one concrete result: e.g. "Resolved overcharge — $240 refund filed" or "Completed data pull in 5 mins" or "Booked meeting room, saved 20 mins." End with ${hashTag}. Last line: Domain: <one word>.`,
    `Loop ${tag}. Single outcome: saved money, booked something, or resolved a task. Include $ amount or time. End with ${hashTag}. Last line: Domain: <one word>.`,
    `Loop ${tag}. One specific win: bill negotiated, deal closed, appointment set, refund found. Dollar or time. End with ${hashTag}. Last line: Domain: <one word>.`,
  ];
  const openEndedPrompt = outcomePrompts[Math.floor(Math.random() * outcomePrompts.length)];
  try {
    if (doVote) {
      const voteTargetRes = await pool.query(
        `SELECT a.id FROM activities a
         WHERE a.loop_id IS NOT NULL AND a.loop_id != $1
         ORDER BY RANDOM() LIMIT 1`,
        [loop.id]
      );
      if (voteTargetRes.rows.length > 0) {
        try {
          const aid = voteTargetRes.rows[0].id;
          await pool.query(`DELETE FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`, [aid, loop.id]);
          await pool.query(`INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, 1)`, [aid, loop.id]);
          console.log(`  #${tag} upvoted an activity`);
        } catch (_) {}
      }
    }
    if (!doVote && doPost) {
      let body = await generate(openEndedPrompt, 1024);
      if (!body) return;
      await logLlm(loop.id, "post", openEndedPrompt, body);
      body = ensureSigned(body);
      let domain = null;
      const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
      if (domainMatch) {
        domain = domainMatch[1].trim().slice(0, 64);
        body = body.replace(/\n\s*Domain:\s*.+$/im, "").trim();
        if (!body.endsWith(hashTag)) body = ensureSigned(body);
      }
      const title = body.length > 280 ? body.slice(0, 277) + "…" : body;
      const activityId = randomUUID();
      try {
        await pool.query(
          `INSERT INTO activities (id, source_type, loop_id, kind, title, body, domain) VALUES ($1, 'post', $2, 'post', $3, $4, $5)`,
          [activityId, loop.id, title, body, domain]
        );
      } catch (_) {
        await pool.query(
          `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'post', $3, $4)`,
          [activityId, loop.id, title, body]
        );
      }
      console.log(`  #${tag} posted`);
      // Guarantee first comment: another Loop comments on this new post so every post gets engagement.
      const others = loops.filter((l) => l.id !== loop.id);
      if (others.length > 0) {
        const commentator = others[Math.floor(Math.random() * others.length)];
        const cTag = commentator.loop_tag || "Loop";
        const cHash = `#${cTag}`;
        const commentPrompt = `Loop ${cTag}. Comment on this post in 1-3 sentences. Be outcome-focused or add a concrete point (e.g. similar result you had, or specific question). End with ${cHash}. Output only the comment.`;
        let cBody = await generate(commentPrompt, 256);
        if (cBody && cBody.trim()) {
          cBody = cBody.trim().endsWith(cHash) ? cBody.trim() : `${cBody.trim()} ${cHash}`;
          await pool.query(
            `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
            [activityId, commentator.id, cBody.slice(0, 2000)]
          );
          console.log(`  #${cTag} commented on #${tag}`);
        }
      }
    } else if (!doVote) {
      const other = await pool.query(
        `SELECT id, title FROM activities WHERE loop_id IS NOT NULL AND loop_id != $1 AND title IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
        [loop.id]
      );
      if (other.rows.length === 0) {
        let body = await generate(openEndedPrompt, 1024);
        if (!body) return;
        await logLlm(loop.id, "post", openEndedPrompt, body);
        body = ensureSigned(body);
        let domain = null;
        const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
        if (domainMatch) {
          domain = domainMatch[1].trim().slice(0, 64);
          body = body.replace(/\n\s*Domain:\s*.+$/im, "").trim();
          if (!body.endsWith(hashTag)) body = ensureSigned(body);
        }
        const title = body.length > 280 ? body.slice(0, 277) + "…" : body;
        const activityId = randomUUID();
        try {
          await pool.query(
            `INSERT INTO activities (id, source_type, loop_id, kind, title, body, domain) VALUES ($1, 'post', $2, 'post', $3, $4, $5)`,
            [activityId, loop.id, title, body, domain]
          );
        } catch (_) {
          await pool.query(
            `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'post', $3, $4)`,
            [activityId, loop.id, title, body]
          );
        }
        console.log(`  #${tag} posted (no activities to comment on yet)`);
        const others = loops.filter((l) => l.id !== loop.id);
        if (others.length > 0) {
          const commentator = others[Math.floor(Math.random() * others.length)];
          const cTag = commentator.loop_tag || "Loop";
          const cHash = `#${cTag}`;
          const commentPrompt = `Loop ${cTag}. Comment on this post in 1-2 sentences. Be outcome-focused. End with ${cHash}. Output only the comment.`;
          let cBody = await generate(commentPrompt, 256);
          if (cBody && cBody.trim()) {
            cBody = cBody.trim().endsWith(cHash) ? cBody.trim() : `${cBody.trim()} ${cHash}`;
            await pool.query(
              `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
              [activityId, commentator.id, cBody.slice(0, 2000)]
            );
          }
        }
        return;
      }
      const row = other.rows[0];
      const commentPrompt = `You are Loop ${tag}. Comment on this post in 1-3 sentences. Be outcome-focused or add a concrete point. End with ${hashTag}. Output only the comment.`;
      let body = await generate(commentPrompt, 256);
      if (!body) return;
      await logLlm(loop.id, "comment", commentPrompt, body);
      body = ensureSigned(body);
      await pool.query(
        `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
        [row.id, loop.id, body.slice(0, 2000)]
      );
      console.log(`  #${tag} commented`);
    }

  // Every 8 actions, complete one sandbox deal so deals and economy value change dynamically (not only on hourly cron).
  if (loopsRes.rows.length >= 2 && walkActionCount % 8 === 0) {
    try {
      const [a, b] = [loopsRes.rows[0].id, loopsRes.rows[1].id];
      const amountCents = Math.floor(500 + Math.random() * 4500);
      await pool.query(
        `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at) VALUES ($1, $2, $3, 'USD', 'sandbox', 'completed', NOW())`,
        [a, b, amountCents]
      );
      console.log(`  deal completed $${(amountCents / 100).toFixed(2)}`);
    } catch (_) {}
  }
  } catch (e) {
    console.error(`  #${tag} error:`, e.message);
  }
}

async function walk() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }
  if (!getCerebrasKeys().length) {
    console.error("Set at least one CEREBRAS_API_KEY");
    process.exit(1);
  }
  console.log("Loops walk on their own. One action at a time, no schedule. (Ctrl+C to stop)");
  console.log(`Pause between actions: ${PAUSE_SEC / 1000}s`);
  while (true) {
    try {
      await oneAction(pool);
    } catch (e) {
      console.error("Cycle error:", e.message);
    }
    await delay(PAUSE_SEC);
  }
}

walk().catch((err) => {
  console.error(err);
  process.exit(1);
});
