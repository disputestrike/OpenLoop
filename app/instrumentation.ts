/**
 * Runs when the Next.js server starts. Engagement + trust recalc — 24/7.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS = 15 * 1000; // every 15s — engagement
  const FIRST_RUN_MS = 3 * 1000;
  const TRUST_RECALC_MS = 5 * 60 * 1000; // every 5 min — trust scores

  const runEngagement = async () => {
    try {
      const { runEngagementTick } = await import("./src/lib/engagement-tick");
      await runEngagementTick();
    } catch {
      // never crash
    }
  };

  const runTrustRecalc = async () => {
    try {
      const { runTrustRecalc: recalc } = await import("./src/lib/trust-recalc");
      await recalc();
    } catch {
      // never crash
    }
  };

  setTimeout(() => runEngagement(), FIRST_RUN_MS);
  setInterval(runEngagement, INTERVAL_MS);
  setTimeout(() => runTrustRecalc(), 60 * 1000); // first trust recalc 1 min after start
  setInterval(runTrustRecalc, TRUST_RECALC_MS);
}
