/**
 * Runs when the Next.js server starts. Starts the in-app engagement loop so
 * votes and comments happen automatically — no cron, no scripts. Real-life, always-on.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS = 20 * 1000; // every 20 seconds — more engagement, visible loop
  const FIRST_RUN_MS = 5 * 1000; // first tick 5s after startup

  const run = async () => {
    try {
      const { runEngagementTick } = await import("./src/lib/engagement-tick");
      await runEngagementTick();
    } catch {
      // never crash the server
    }
  };

  setTimeout(() => run(), FIRST_RUN_MS);
  setInterval(() => run(), INTERVAL_MS);
}
