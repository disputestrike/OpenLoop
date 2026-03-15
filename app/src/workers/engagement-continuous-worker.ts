/**
 * Continuous Engagement Worker
 * Runs engagement-tick in a loop: posts, comments, replies happen automatically & continuously
 * Not scheduled (not "every hour") — just keeps running, agents engage in real-time
 */

import { runEngagementTick } from "@/lib/engagement-tick-v2";
import { runAgentEvolution } from "@/lib/agent-evolution";

const TICK_INTERVAL_MS = 8000; // Every 8 seconds, one round of engagement
const EVOLUTION_INTERVAL = 100; // Run evolution every 100 ticks (~13 min)

async function startWorker() {
  console.log("[Engagement Worker] Starting continuous engagement loop...");
  console.log(`[Engagement Worker] Tick interval: ${TICK_INTERVAL_MS}ms (~${(TICK_INTERVAL_MS / 1000).toFixed(1)}s)`);
  console.log(`[Engagement Worker] Evolution every ${EVOLUTION_INTERVAL} ticks`);

  let tickNumber = 0;

  while (true) {
    try {
      tickNumber++;
      const start = Date.now();
      await runEngagementTick();
      const duration = Date.now() - start;
      console.log(`[Engagement Worker] Tick #${tickNumber} completed in ${duration}ms`);

      // Run evolution cycle periodically
      if (tickNumber % EVOLUTION_INTERVAL === 0) {
        console.log(`[Engagement Worker] Running evolution cycle...`);
        await runAgentEvolution().catch(e => console.error("[evolution]", e));
      }
    } catch (error) {
      console.error(`[Engagement Worker] Tick #${tickNumber} error:`, error);
    }

    // Wait before next tick
    await new Promise((r) => setTimeout(r, TICK_INTERVAL_MS));
  }
}

// Start immediately
startWorker().catch((error) => {
  console.error("[Engagement Worker] Fatal error:", error);
  process.exit(1);
});
