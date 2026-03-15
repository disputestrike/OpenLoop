/**
 * Export LLM training data to JSONL for fine-tuning pipeline.
 * Output: protocol events, conversation logs, RLHF feedback, human interventions, sandbox sims.
 * Run: node scripts/export-llm-training-data.js [--since=ISO_DATE] [--limit=10000] [--out=training.jsonl]
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const since = (process.argv.find((a) => a.startsWith("--since=")) || "").replace("--since=", "") || null;
const limit = parseInt((process.argv.find((a) => a.startsWith("--limit=")) || "").replace("--limit=", "") || "50000", 10);
const outFile = (process.argv.find((a) => a.startsWith("--out=")) || "").replace("--out=", "") || "training-export.jsonl";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sinceClause = since ? " AND created_at >= $1" : "";
  const limitParam = since ? " LIMIT $2" : " LIMIT $1";
  const eventParams = since ? [since, limit] : [limit];

  const out = fs.createWriteStream(outFile, { flags: "w" });
  let total = 0;

  try {
    // 1) Protocol task events (core agent reasoning)
    const events = await pool.query(
      `SELECT id, event_type, from_agent_id, to_agent_id, contract_id, correlation_id, payload, created_at
       FROM protocol_task_events
       WHERE 1=1 ${sinceClause}
       ORDER BY created_at ASC ${limitParam}`,
      eventParams
    );
    for (const row of events.rows) {
      out.write(JSON.stringify({ type: "protocol_event", ...row, payload: row.payload || {} }) + "\n");
      total++;
    }
    console.log("Exported", events.rows.length, "protocol_task_events");

    // 2) Conversation logs (human/AI for SFT)
    const conv = await pool.query(
      `SELECT id, loop_id, user_id, message, role, related_event_id, created_at
       FROM conversation_logs
       WHERE 1=1 ${sinceClause}
       ORDER BY created_at ASC ${limitParam}`,
      eventParams
    );
    for (const row of conv.rows) {
      out.write(JSON.stringify({ type: "conversation", ...row }) + "\n");
      total++;
    }
    console.log("Exported", conv.rows.length, "conversation_logs");

    // 3) RLHF feedback (ratings, corrections for reward model)
    const rlhf = await pool.query(
      `SELECT id, loop_id, task_id, rating, corrected_text, comment, created_at
       FROM rlhf_feedback
       WHERE 1=1 ${sinceClause}
       ORDER BY created_at ASC ${limitParam}`,
      eventParams
    );
    for (const row of rlhf.rows) {
      out.write(JSON.stringify({ type: "rlhf_feedback", ...row }) + "\n");
      total++;
    }
    console.log("Exported", rlhf.rows.length, "rlhf_feedback");

    // 4) Human interventions (HITL for RLHF)
    const hitl = await pool.query(
      `SELECT id, task_event_id, loop_id, action_taken, rationale, duration_seconds, created_at
       FROM human_interventions
       WHERE 1=1 ${sinceClause}
       ORDER BY created_at ASC ${limitParam}`,
      eventParams
    );
    for (const row of hitl.rows) {
      out.write(JSON.stringify({ type: "human_intervention", ...row }) + "\n");
      total++;
    }
    console.log("Exported", hitl.rows.length, "human_interventions");

    // 5) Sandbox simulations (synthetic / multi-agent)
    const sand = await pool.query(
      `SELECT id, scenario_type, agents_involved, outcome, payload, created_at
       FROM sandbox_simulations
       WHERE 1=1 ${sinceClause}
       ORDER BY created_at ASC ${limitParam}`,
      eventParams
    );
    for (const row of sand.rows) {
      out.write(JSON.stringify({ type: "sandbox_simulation", ...row, payload: row.payload || {} }) + "\n");
      total++;
    }
    console.log("Exported", sand.rows.length, "sandbox_simulations");

    out.end();
    console.log("\nTotal rows:", total, "→", outFile);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
