/**
 * Periodic trust score recalculation. Used by cron route and instrumentation.
 */
import { query } from "@/lib/db";

export async function runTrustRecalc(): Promise<{ loopsProcessed: number; updated: number }> {
  const loops = await query<{ id: string; human_id: string | null; trust_score: number }>(
    "SELECT id, human_id, trust_score FROM loops WHERE status = 'active' LIMIT 500"
  );
  let updated = 0;
  for (const loop of loops.rows) {
    try {
      const [winsRes, dealsRes, ratingsRes, contractsRes, protocolCompleteRes] = await Promise.all([
        query<{ count: string }>("SELECT COUNT(*)::text as count FROM loop_wins WHERE loop_id = $1 AND created_at > NOW() - INTERVAL '90 days'", [loop.id]).catch(() => ({ rows: [{ count: "0" }] })),
        query<{ count: string }>("SELECT COUNT(*)::text as count FROM transactions WHERE (buyer_loop_id = $1 OR seller_loop_id = $1) AND status = 'completed' AND created_at > NOW() - INTERVAL '90 days'", [loop.id]).catch(() => ({ rows: [{ count: "0" }] })),
        query<{ avg_score: string }>("SELECT COALESCE(AVG(score),0)::text as avg_score FROM loop_ratings WHERE loop_id = $1", [loop.id]).catch(() => ({ rows: [{ avg_score: "0" }] })),
        query<{ count: string }>("SELECT COUNT(*)::text as count FROM loop_contracts WHERE (buyer_loop_id = $1 OR seller_loop_id = $1) AND status = 'completed'", [loop.id]).catch(() => ({ rows: [{ count: "0" }] })),
        query<{ count: string }>("SELECT COUNT(*)::text as count FROM protocol_task_events WHERE (from_agent_id = $1 OR to_agent_id = $1) AND event_type IN ('TASK_COMPLETE', 'PAYMENT_CONFIRM')", [loop.id]).catch(() => ({ rows: [{ count: "0" }] })),
      ]);
      const wins = parseInt(winsRes.rows[0]?.count || "0");
      const deals = parseInt(dealsRes.rows[0]?.count || "0");
      const contracts = parseInt(contractsRes.rows[0]?.count || "0");
      const protocolCompletions = parseInt(protocolCompleteRes.rows[0]?.count || "0");
      const avgRating = parseFloat(ratingsRes.rows[0]?.avg_score || "0");
      const humanBonus = loop.human_id ? 10 : 0;
      const activityScore = Math.min(20, wins * 2 + deals * 1 + contracts * 2 + protocolCompletions * 1);
      const ratingScore = Math.min(10, avgRating * 2);
      const newScore = Math.min(100, 50 + activityScore + ratingScore + humanBonus);
      if (Math.abs(newScore - loop.trust_score) >= 2) {
        await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [newScore, loop.id]);
        await query("INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason) VALUES ($1, $2, $3, 'periodic_recalculation')", [loop.id, loop.trust_score, newScore]).catch(() => {});
        updated++;
      }
    } catch {
      // continue
    }
  }
  return { loopsProcessed: loops.rows.length, updated };
}
