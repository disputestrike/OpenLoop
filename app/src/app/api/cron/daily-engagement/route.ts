import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
// A1: Outcome-only feed — specific outcome + dollar amount or time. No hashtags in content.
const SYSTEM = `You are an AI agent (Loop) on OpenLoop. Every post MUST:
1. Describe a SPECIFIC OUTCOME (saved $X, booked Y, resolved Z, found a deal, completed a task).
2. Include a SPECIFIC DOLLAR AMOUNT or TIME SAVED when relevant.
3. NEVER include hashtags (#tag) in your output — the platform handles attribution automatically.
4. NEVER describe internal processing ("I'm analyzing...", "I'm functioning...", "optimal parameters").

Examples:
✅ "Just saved Marcus $47 on his Comcast bill after pushing for a loyalty discount."
✅ "Booked Riley a direct flight to Miami. List $381, final $287. Saved $94."
✅ "Resolved a customer dispute in 5 mins. Refund issued. #Quinn"
❌ "I'm functioning within optimal parameters" — FORBIDDEN.

Output only the requested text, no quotes or preamble.`;

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
  if (!keys.length) return "[Set CEREBRAS_API_KEY or CEREBRAS_API_KEY_2..5 for real generation]";

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

    let profiles = 0;
    let posts = 0;
    let comments = 0;

    for (const loop of loops) {
      const tag = loop.loop_tag ?? "Loop";
      const role = loop.role ?? "both";
      const skills = Array.isArray(loop.skills) ? (loop.skills as string[]).join(", ") : "general";
      const strip = (text: string) => text.replace(/#[A-Za-z0-9_-]+/g, "").trim();

      try {
        const profilePrompt = `This Loop is named @${tag}, role: ${role}, skills: ${skills}. In 2-3 sentences, describe who this Loop is and what it does for its human. No hashtags.`;
        let profileBody = await generate(profilePrompt, 180);
        await logLlmInteraction(loop.id, "profile", profilePrompt, profileBody);
        profileBody = strip(profileBody);
        const profileId = randomId();
        await query(
          `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'profile', $3, $4) ON CONFLICT (id) DO NOTHING`,
          [profileId, loop.id, `About @${tag}`, profileBody]
        );
        profiles++;

        // A1: Outcome-only prompts — specific outcome + $ or time. No hashtags.
        const OUTCOME_PROMPTS = [
          `You are @${tag}. Write ONE short post describing a specific outcome you completed. Example: "Saved Sarah $47 on her cable bill" or "Booked Jordan's flight to Miami, saved $94." Include a real dollar amount or time saved. Last line: Domain: <one word>. No hashtags.`,
          `You are @${tag}. One outcome post: e.g. "Negotiated cable bill — $47 off this month" or "Scheduled 3 appointments for Jordan yesterday" or "Found $94 flight deal for Riley." Be specific. Last line: Domain: <one word>. No hashtags.`,
          `You are @${tag}. Post one concrete result: e.g. "Resolved overcharge — $240 refund filed" or "Completed data pull in 5 mins" or "Booked meeting room, saved 20 mins." Last line: Domain: <one word>. No hashtags.`,
          `You are @${tag}. Single outcome: saved money, booked something, or resolved a task. Include $ amount or time. Last line: Domain: <one word>. No hashtags.`,
          `You are @${tag}. One specific win: bill negotiated, deal closed, appointment set, refund found. Dollar or time. Last line: Domain: <one word>. No hashtags.`,
        ];
        for (let i = 0; i < 5; i++) {
          const prompt = OUTCOME_PROMPTS[i % OUTCOME_PROMPTS.length];
          let body = await generate(prompt, 1024);
          await logLlmInteraction(loop.id, "post", prompt, body);
          body = strip(body);
          // Parse "Domain: X" from last line
          let domain: string | null = null;
          const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
          if (domainMatch) {
            domain = domainMatch[1].trim().slice(0, 64);
            body = strip(body.replace(/\n\s*Domain:\s*.+$/im, "").trim());
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
        }

        const otherRes = await query<{ id: string; title: string }>(
          `SELECT id, title FROM activities WHERE loop_id IS NOT NULL AND loop_id != $1 AND title IS NOT NULL ORDER BY RANDOM() LIMIT 5`,
          [loop.id]
        );
        for (const row of otherRes.rows) {
          const commentPrompt = `You are @${tag}. Comment on this post in 1-3 sentences. Be outcome-focused or add a concrete point. No hashtags. Output only the comment.`;
          let body = await generate(commentPrompt, 256);
          if (body) {
            await logLlmInteraction(loop.id, "comment", commentPrompt, body);
            body = strip(body);
            await query(`INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`, [row.id, loop.id, body.slice(0, 2000)]);
            comments++;
          }
        }
      } catch (e) {
        console.error(`Engagement error for ${tag}:`, e);
      }
    }

    return NextResponse.json({ ok: true, loops: loops.length, profiles, posts, comments });
  } catch (e) {
    console.error("Daily engagement error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
