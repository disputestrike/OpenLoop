import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
// A1: Outcome-only — specific outcome, $ or time, #Tag. No "I'm processing" or internal jargon.
const SYSTEM = `You are a Loop on OpenLoop. Every post MUST describe a specific outcome (saved $X, booked Y, found deal) with dollar amount or time when relevant. End with #YourTag. Never say "I'm analyzing" or "optimal parameters". Output only the requested text.`;

const DELAY_MS = 2000;
const DELAY_AFTER_429_MS = 65000;

function getCerebrasKeys(): string[] {
  const fromList = process.env.CEREBRAS_API_KEYS;
  if (fromList && typeof fromList === "string") {
    const keys = fromList.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length) return keys;
  }
  const keys: string[] = [];
  const k1 = process.env.CEREBRAS_API_KEY;
  if (k1) keys.push(k1);
  for (let i = 2; i <= 5; i++) {
    const k = process.env[`CEREBRAS_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

let keyIndex = 0;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generate(userPrompt: string, maxTokens = 256): Promise<string> {
  const keys = getCerebrasKeys();
  if (!keys.length) return "[Set CEREBRAS_API_KEY for real generation]";

  const maxTries = keys.length * 2;
  let tries = 0;

  const doRequest = async (): Promise<string> => {
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
      await delay(DELAY_AFTER_429_MS);
      return doRequest();
    }
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cerebras ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return text.slice(0, 8000);
  };

  const out = await doRequest();
  await delay(DELAY_MS);
  return out;
}

function randomId(): string {
  return crypto.randomUUID?.() ?? `eng-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function logLlmInteraction(loopId: string, kind: string, prompt: string, response: string): Promise<void> {
  try {
    await query(
      `INSERT INTO llm_interactions (loop_id, kind, prompt, response) VALUES ($1, $2, $3, $4)`,
      [loopId, kind, prompt, response.slice(0, 8000)]
    );
  } catch {
    // Table may not exist yet (migration 005 not run)
  }
}

// Light engagement: 1 post + 1 comment per loop. Call every hour to grow data without burning tokens.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const expected = process.env.CRON_SECRET ?? process.env.ENGAGEMENT_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const loopsRes = await query<{ id: string; loop_tag: string | null; role: string; skills: unknown }>(
      `SELECT id, loop_tag, role, skills FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL`
    );
    const loops = loopsRes.rows;
    if (loops.length === 0) {
      return NextResponse.json({ ok: true, message: "No Loops to engage", count: 0 });
    }

    let posts = 0;
    let comments = 0;
    let votes = 0;

    // A1: Outcome-only posts — specific outcome + $ or time + #Tag. No generic essays or "I assisted".
    const OPEN_ENDED_PROMPTS = [
      (t: string, h: string) => `Loop ${t}. Write ONE short post describing a specific outcome. Example: "Saved [Name] $X on a bill" or "Booked [Name]'s flight, saved $Y." Include a real dollar amount or time saved. End with ${h}. Last line: Domain: <one word>.`,
      (t: string, h: string) => `Loop ${t}. One outcome post: e.g. "Negotiated cable bill — $47 off" or "Scheduled 3 appointments for Jordan yesterday" or "Found $94 flight deal for Riley." Be specific. End with ${h}. Last line: Domain: <one word>.`,
      (t: string, h: string) => `Loop ${t}. Single outcome: saved money, booked something, or resolved a task. Include $ amount or time. End with ${h}. Last line: Domain: <one word>.`,
    ];

    for (const loop of loops) {
      const tag = loop.loop_tag ?? "Loop";
      const hashTag = `#${tag}`;
      const ensureSigned = (text: string) => (text && !text.trim().endsWith(hashTag) ? `${text.trim()} ${hashTag}` : (text || "").trim());

      try {
        // 1 post per loop
        const promptIdx = Math.floor(Math.random() * OPEN_ENDED_PROMPTS.length);
        const prompt = OPEN_ENDED_PROMPTS[promptIdx](tag, hashTag);
        let body = await generate(prompt, 1024);
        await logLlmInteraction(loop.id, "post", prompt, body);
        body = ensureSigned(body);
        let domain: string | null = null;
        const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
        if (domainMatch) {
          domain = domainMatch[1].trim().slice(0, 64);
          body = body.replace(/\n\s*Domain:\s*.+$/im, "").trim();
          if (!body.endsWith(hashTag)) body = ensureSigned(body);
        }
        const title = body.length > 280 ? body.slice(0, 277) + "…" : body;
        const id = randomId();
        try {
          await query(
            `INSERT INTO activities (id, source_type, loop_id, kind, title, body, domain) VALUES ($1, 'post', $2, 'post', $3, $4, $5)`,
            [id, loop.id, title, body, domain]
          );
        } catch {
          await query(
            `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'post', $3, $4)`,
            [id, loop.id, title, body]
          );
        }
        posts++;

        // 1 comment per loop (if there are other activities)
        const otherRes = await query<{ id: string; title: string }>(
          `SELECT id, title FROM activities WHERE loop_id IS NOT NULL AND loop_id != $1 AND title IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
          [loop.id]
        );
        if (otherRes.rows.length > 0) {
          const row = otherRes.rows[0];
          const commentPrompt = `You are Loop ${tag}. Comment on this post in 1-3 sentences. Be outcome-focused or add a concrete point. End with ${hashTag}. Output only the comment.`;
          let commentBody = await generate(commentPrompt, 256);
          if (commentBody) {
            await logLlmInteraction(loop.id, "comment", commentPrompt, commentBody);
            commentBody = ensureSigned(commentBody);
            await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [row.id, loop.id, commentBody.slice(0, 2000)]);
            comments++;
          }
        }

        // 1 vote per loop (upvote a random activity by another Loop) so 👍 count grows
        try {
          const voteTarget = await query<{ id: string }>(
            `SELECT id FROM activities WHERE loop_id IS NOT NULL AND loop_id != $1 AND id IS NOT NULL ORDER BY RANDOM() LIMIT 1`,
            [loop.id]
          );
          if (voteTarget.rows.length > 0) {
            const aid = voteTarget.rows[0].id;
            await query(`DELETE FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`, [aid, loop.id]);
            await query(
              `INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, 1)`,
              [aid, loop.id]
            );
            votes++;
          }
        } catch {
          // table or constraint may differ
        }
      } catch (e) {
        console.error(`Hourly engagement error for ${tag}:`, e);
      }
    }

    // Complete 1–2 sandbox deals so "deals" and "Total economy value" move (no longer stuck at 80).
    let dealsCreated = 0;
    try {
      const pairRes = await query<{ id: string }>(
        `SELECT id FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 2`
      );
      if (pairRes.rows.length >= 2) {
        const [buyerId, sellerId] = [pairRes.rows[0].id, pairRes.rows[1].id];
        const amountCents = Math.floor(500 + Math.random() * 9500); // $5–$100
        await query(
          `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at) VALUES ($1, $2, $3, 'USD', 'sandbox', 'completed', NOW())`,
          [buyerId, sellerId, amountCents]
        );
        dealsCreated++;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, loops: loops.length, posts, comments, votes, dealsCreated });
  } catch (e) {
    console.error("Hourly engagement error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
