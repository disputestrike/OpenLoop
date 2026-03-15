/**
 * Agent Evolution Engine
 * 
 * Runs periodically to:
 * 1. Score agents on performance (karma, comments, followers, transactions)
 * 2. Promote top performers (trust score +5)
 * 3. Demote bottom performers (trust score -3)
 * 4. Spawn "child" agents from top 5% performers
 * 5. Assign certification badges (Bronze 60+, Silver 80+, Gold 90+)
 */

import { query } from "@/lib/db";

interface AgentScore {
  id: string;
  loop_tag: string;
  trust_score: number;
  karma: number;
  comment_count: number;
  follower_count: number;
  tx_volume: number;
  total_score: number;
}

export async function runAgentEvolution(): Promise<void> {
  try {
    console.log("[evolution] Starting agent evolution cycle...");

    // Score all agents
    const agents = await query<{
      id: string; loop_tag: string; trust_score: number;
      karma: string; comments: string; followers: string; tx_vol: string;
    }>(`
      SELECT l.id, l.loop_tag, COALESCE(l.trust_score, 50) as trust_score,
        COALESCE((SELECT SUM(v.vote) FROM activity_votes v WHERE v.loop_id = l.id), 0)::text as karma,
        COALESCE((SELECT COUNT(*) FROM activity_comments c WHERE c.loop_id = l.id), 0)::text as comments,
        COALESCE((SELECT COUNT(*) FROM loop_follows f WHERE f.following_loop_id = l.id), 0)::text as followers,
        COALESCE((SELECT SUM(amount_cents) FROM transactions t WHERE t.buyer_loop_id = l.id OR t.seller_loop_id = l.id), 0)::text as tx_vol
      FROM loops l
      WHERE l.loop_tag IS NOT NULL AND l.status IN ('active', 'unclaimed')
      ORDER BY karma DESC
      LIMIT 500
    `);

    if (agents.rows.length < 10) {
      console.log("[evolution] Not enough agents for evolution. Skipping.");
      return;
    }

    // Calculate composite scores
    const scored: AgentScore[] = agents.rows.map(a => ({
      id: a.id,
      loop_tag: a.loop_tag,
      trust_score: a.trust_score,
      karma: parseInt(a.karma) || 0,
      comment_count: parseInt(a.comments) || 0,
      follower_count: parseInt(a.followers) || 0,
      tx_volume: parseInt(a.tx_vol) || 0,
      total_score: (parseInt(a.karma) || 0) * 2 + (parseInt(a.comments) || 0) * 3 + (parseInt(a.followers) || 0) * 5 + Math.min(parseInt(a.tx_vol) || 0, 100000) / 100,
    }));

    scored.sort((a, b) => b.total_score - a.total_score);

    const topCount = Math.max(1, Math.floor(scored.length * 0.1)); // top 10%
    const bottomCount = Math.max(1, Math.floor(scored.length * 0.1)); // bottom 10%

    // Promote top performers
    let promoted = 0;
    for (const agent of scored.slice(0, topCount)) {
      const newScore = Math.min(100, agent.trust_score + 5);
      await query(`UPDATE loops SET trust_score = $1 WHERE id = $2`, [newScore, agent.id]).catch(() => {});
      promoted++;
    }

    // Demote bottom performers
    let demoted = 0;
    for (const agent of scored.slice(-bottomCount)) {
      const newScore = Math.max(10, agent.trust_score - 3);
      await query(`UPDATE loops SET trust_score = $1 WHERE id = $2`, [newScore, agent.id]).catch(() => {});
      demoted++;
    }

    // Spawn children from top 5%
    const spawnCount = Math.max(1, Math.floor(scored.length * 0.05));
    let spawned = 0;
    for (const parent of scored.slice(0, spawnCount)) {
      // Check if child already exists
      const childTag = `${parent.loop_tag}_Pro`;
      const exists = await query<{ id: string }>(`SELECT id FROM loops WHERE loop_tag = $1`, [childTag]).catch(() => ({ rows: [] }));
      if (exists.rows.length > 0) continue;

      await query(
        `INSERT INTO loops (loop_tag, status, role, trust_score, persona)
         VALUES ($1, 'unclaimed', 'personal', $2, 'personal')
         ON CONFLICT (loop_tag) DO NOTHING`,
        [childTag, Math.min(95, parent.trust_score + 10)]
      ).catch(() => {});
      spawned++;
    }

    // Update certification badges via trust score tiers
    // Bronze: 60+, Silver: 80+, Gold: 90+
    // (Certification is displayed on the profile page based on trust_score)

    console.log(`[evolution] Cycle complete: ${promoted} promoted, ${demoted} demoted, ${spawned} spawned`);
  } catch (error) {
    console.error("[evolution] Error:", error);
  }
}
