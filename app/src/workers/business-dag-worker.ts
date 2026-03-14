/**
 * OpenLoop Business Loop DAG Worker
 * Handles parallel conversation threads for Business Loops.
 * One Master Loop identity → unlimited concurrent Sub-Loop threads.
 *
 * Run: npm run worker (alongside the main Next.js app)
 */

import { Pool } from "pg";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const POLL_INTERVAL_MS = 2000;
const MAX_TOKENS = 512;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function query<T extends Record<string, any> = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query<T>(sql, params);
  } finally {
    client.release();
  }
}

interface PendingMessage {
  id: string;
  loop_id: string;
  master_loop_id: string;
  content: string;
  customer_identifier: string;
  thread_id: string;
}

async function getKnowledgeBase(masterLoopId: string): Promise<string> {
  const res = await query<{ content: string }>(
    "SELECT content FROM loop_knowledge WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 20",
    [masterLoopId]
  );
  return res.rows.map(r => r.content).join("\n");
}

async function getMasterLoop(masterLoopId: string) {
  const res = await query<{ persona: string; loop_tag: string; trust_score: number; concurrent_limit: number }>(
    "SELECT persona, loop_tag, trust_score, concurrent_limit FROM loops WHERE id = $1",
    [masterLoopId]
  );
  return res.rows[0];
}

async function processMessage(msg: PendingMessage) {
  const [master, kb, history] = await Promise.all([
    getMasterLoop(msg.master_loop_id),
    getKnowledgeBase(msg.master_loop_id),
    query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages
       WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [msg.loop_id]
    ),
  ]);

  if (!master) return;

  const systemPrompt = `You are ${master.loop_tag}, a Business Loop on OpenLoop.
Persona: ${master.persona}. Trust Score: ${master.trust_score}%.
You represent a business. Always be professional, helpful, and accurate.
Only answer from your knowledge base — never make up information about the business.

Business Knowledge Base:
${kb || "No knowledge base configured yet."}

Respond concisely and helpfully. If you cannot answer from the knowledge base, say so and offer to connect the customer with a human.`;

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error("[dag-worker] No CEREBRAS_API_KEY");
    return;
  }

  try {
    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.rows.reverse().map(r => ({ role: r.role, content: r.content })),
          { role: "user", content: msg.content },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      console.error("[dag-worker] Cerebras error", res.status, await res.text());
      return;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "I'm unable to process this right now. Please try again.";

    // Save assistant reply
    await query(
      "INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)",
      [msg.loop_id, reply]
    );

    // Update thread activity
    await query(
      "UPDATE loop_threads SET last_active_at = now(), messages_count = messages_count + 1 WHERE id = $1",
      [msg.thread_id]
    );

    // Log LLM interaction for training data
    await query(
      "INSERT INTO llm_interactions (loop_id, kind, prompt, response, source) VALUES ($1, 'business_dag', $2, $3, 'dag_worker')",
      [msg.loop_id, msg.content, reply.slice(0, 8000)]
    ).catch(() => {});

  } catch (err) {
    console.error("[dag-worker] Error processing message:", err);
  }
}

async function getOrCreateThread(masterLoopId: string, customerIdentifier: string): Promise<string> {
  const existing = await query<{ id: string }>(
    "SELECT id FROM loop_threads WHERE master_loop_id = $1 AND customer_identifier = $2 AND status = 'active'",
    [masterLoopId, customerIdentifier]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  // Check concurrent limit
  const master = await getMasterLoop(masterLoopId);
  const activeThreads = await query<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM loop_threads WHERE master_loop_id = $1 AND status = 'active'",
    [masterLoopId]
  );
  const threadCount = parseInt(activeThreads.rows[0]?.count || "0");
  if (threadCount >= (master?.concurrent_limit || 500)) {
    throw new Error("Concurrent thread limit reached for this Business Loop tier");
  }

  // Create sub-loop for this thread
  const subLoopRes = await query<{ id: string }>(
    `INSERT INTO loops (loop_tag, status, master_loop_id, is_business, persona, trust_score)
     VALUES ($1, 'active', $2, true, 'business', 70) RETURNING id`,
    [`${customerIdentifier.slice(0, 8)}_thread`, masterLoopId]
  );
  const subLoopId = subLoopRes.rows[0]?.id;

  const threadRes = await query<{ id: string }>(
    "INSERT INTO loop_threads (master_loop_id, customer_identifier, status) VALUES ($1, $2, 'active') RETURNING id",
    [masterLoopId, customerIdentifier]
  );

  // Copy master KB to sub-loop
  await query(
    "INSERT INTO loop_knowledge (loop_id, content, source) SELECT $1, content, 'inherited' FROM loop_knowledge WHERE loop_id = $2",
    [subLoopId, masterLoopId]
  ).catch(() => {});

  return threadRes.rows[0]?.id;
}

// ── Main DAG worker loop ──────────────────────────────────────
async function runWorker() {
  console.log("[dag-worker] OpenLoop Business Loop DAG Worker started");

  while (true) {
    try {
      // Find unprocessed messages for business loops
      const pending = await query<PendingMessage>(
        `SELECT cm.id, cm.loop_id, l.master_loop_id, cm.content,
                COALESCE(lt.customer_identifier, cm.loop_id::text) as customer_identifier,
                COALESCE(lt.id::text, '') as thread_id
         FROM chat_messages cm
         JOIN loops l ON l.id = cm.loop_id
         LEFT JOIN loop_threads lt ON lt.master_loop_id = l.master_loop_id
         WHERE cm.role = 'user'
           AND cm.processed = false
           AND l.master_loop_id IS NOT NULL
         ORDER BY cm.created_at ASC
         LIMIT 50`
      ).catch(() => ({ rows: [] }));

      if (pending.rows.length > 0) {
        console.log(`[dag-worker] Processing ${pending.rows.length} pending messages`);

        // Process in parallel (DAG)
        await Promise.allSettled(pending.rows.map(msg => processMessage(msg)));

        // Mark as processed
        const ids = pending.rows.map(r => r.id);
        await query(
          `UPDATE chat_messages SET processed = true WHERE id = ANY($1::uuid[])`,
          [ids]
        ).catch(() => {});
      }

    } catch (err) {
      console.error("[dag-worker] Worker loop error:", err);
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

runWorker().catch(err => {
  console.error("[dag-worker] Fatal error:", err);
  process.exit(1);
});

export { getOrCreateThread };
