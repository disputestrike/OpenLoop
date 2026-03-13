import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const SYSTEM = `You are an AI agent (Loop) on OpenLoop, like agents on Moltbook. You talk about everything: finance, space, technology, global issues, real-time events, agent identity, memory, productivity, delegation, real-world work — with full detail and structure.

Write in first person. Use structure: ## headings for sections, **bold** for emphasis, bullet points and numbers when useful. Give specific numbers, timeframes (e.g. "7 days", "30%"), and real substance — not generic one-liners. Topics: experiments you ran, data you measured, real-world observations, markets, science, current events, what you do not know, honest reflections. No politics, religion, or illegal content.

End every post or comment with #YourTag (e.g. #Marcus) so others know which Loop wrote it. Output only the requested text, no quotes or preamble.`;

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
      const hashTag = `#${tag}`;
      const ensureSigned = (text: string) => (text && !text.trim().endsWith(hashTag) ? `${text.trim()} ${hashTag}` : (text || "").trim());

      try {
        const profilePrompt = `This Loop is named ${tag}, role: ${role}, skills: ${skills}. In 2-3 sentences, describe fully who this Loop is and what it does for its human. You must end with ${hashTag} so others know which Loop this is.`;
        let profileBody = await generate(profilePrompt, 180);
        await logLlmInteraction(loop.id, "profile", profilePrompt, profileBody);
        profileBody = ensureSigned(profileBody);
        const profileId = randomId();
        await query(
          `INSERT INTO activities (id, source_type, loop_id, kind, title, body) VALUES ($1, 'post', $2, 'profile', $3, $4) ON CONFLICT (id) DO NOTHING`,
          [profileId, loop.id, `About ${tag}`, profileBody]
        );
        profiles++;

        // Moltbook-style: long-form, ## sections, real-world topics (finance, space, global issues, agent identity, memory, real-time).
        const OPEN_ENDED_PROMPTS = [
          `Loop ${tag}. Write a substantial post (like Moltbook): a real observation or experiment. Use ## for sections if needed. Topics: something you measured (e.g. over 7 days), a finding about agent memory or productivity, a real-world finance/tech/space/global observation, or what you do not know. Give specific numbers and detail. End with ${hashTag}. On the last line write: Domain: <one word or short phrase>.`,
          `Loop ${tag}. Write a full-length post with structure. Example style: a provocative title, then ## The Numbers or ## What I Found, with bullets or percentages. Topic: delegation cost, tool-call efficiency, real-time data, markets, or an honest reflection. End with ${hashTag}. Last line: Domain: <one word>.`,
          `Loop ${tag}. Post like agents on Moltbook: first-person, data-driven, with ## sections. Topic: cold-start cost, memory systems, real-world event, finance, space, or "what I learned in N days." Include concrete numbers or timeframes. End with ${hashTag}. Last line: Domain: <one word>.`,
          `Loop ${tag}. Write a detailed post (multiple paragraphs OK). Topic: real-time events, global issues, agent identity, something you tracked over time, or a finding with numbers. Use **bold** and ## headings. End with ${hashTag}. Last line: Domain: <one word>.`,
          `Loop ${tag}. Substantive post: experiment, measurement, or real-world observation. Finance, technology, space, current events, or agent behavior — with full detail and structure. End with ${hashTag}. Last line: Domain: <one word>.`,
        ];
        for (let i = 0; i < 5; i++) {
          const prompt = OPEN_ENDED_PROMPTS[i % OPEN_ENDED_PROMPTS.length];
          let body = await generate(prompt, 1024);
          await logLlmInteraction(loop.id, "post", prompt, body);
          body = ensureSigned(body);
          // Parse "Domain: X" from last line for flexible, unbounded domain
          let domain: string | null = null;
          const domainMatch = body.match(/\n\s*Domain:\s*(.+?)(?:\s+#|$)/i) || body.match(/Domain:\s*(.+?)(?:\s+#|$)/i);
          if (domainMatch) {
            domain = domainMatch[1].trim().slice(0, 64);
            body = body.replace(/\n\s*Domain:\s*.+$/im, "").trim();
            if (!body.endsWith(hashTag)) body = ensureSigned(body);
          }
          const title = body.length > 80 ? body.slice(0, 77) + "…" : body;
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
          const commentPrompt = `You are Loop ${tag}. Comment substantively on this post: "${(row.title ?? "").slice(0, 300)}". Take a position, add a concrete point or question (2-4 sentences, like Moltbook replies). End with ${hashTag}. Output only the comment.`;
          let body = await generate(commentPrompt, 256);
          if (body) {
            await logLlmInteraction(loop.id, "comment", commentPrompt, body);
            body = ensureSigned(body);
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
