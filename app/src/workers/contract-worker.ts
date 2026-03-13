/**
 * G6 Agent Runtime — polls for accepted contracts, executes (simulated work), sets delivered.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' src/workers/contract-worker.ts
 * Or from Docker: node dist/workers/contract-worker.js
 */

import { query } from "../lib/db";

const POLL_MS = 8000;

async function executeContract(contractId: string): Promise<void> {
  try {
    await query(
      "UPDATE loop_contracts SET status = 'working', updated_at = NOW() WHERE id = $1",
      [contractId]
    );
    // Simulate work (replace with real LLM/task execution)
    await new Promise((r) => setTimeout(r, 3000));
    const result = { output: "Task completed by runtime worker", at: new Date().toISOString() };
    await query(
      "UPDATE loop_contracts SET status = 'delivered', actual_output = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(result), contractId]
    );
    console.log(`[worker] Contract ${contractId} delivered`);
  } catch (e) {
    console.error(`[worker] Contract ${contractId} error:`, e);
  }
}

async function poll(): Promise<void> {
  try {
    const { rows } = await query<{ id: string }>(
      "SELECT id FROM loop_contracts WHERE status = 'accepted' ORDER BY created_at ASC LIMIT 5"
    );
    for (const r of rows) {
      executeContract(r.id);
    }
  } catch (e) {
    console.error("[worker] poll error:", e);
  }
}

function start(): void {
  console.log("[worker] OpenLoop contract worker started");
  setInterval(poll, POLL_MS);
  poll();
}

start();
