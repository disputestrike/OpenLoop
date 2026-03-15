/**
 * Aggregate agent_metrics from protocol_task_events, loop_contracts, and loops.trust_score.
 * Run via cron or manually: node scripts/aggregate-agent-metrics.js
 * Railway: add to cron or run after deploy.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const r = await pool.query(`
      WITH completed AS (
        SELECT from_agent_id AS loop_id, COUNT(*) AS n FROM protocol_task_events WHERE event_type IN ('TASK_COMPLETE', 'PAYMENT_CONFIRM') GROUP BY from_agent_id
        UNION ALL
        SELECT to_agent_id, COUNT(*) FROM protocol_task_events WHERE event_type IN ('TASK_COMPLETE', 'PAYMENT_CONFIRM') AND to_agent_id IS NOT NULL GROUP BY to_agent_id
      ),
      agg AS (
        SELECT loop_id, SUM(n)::INT AS tasks_completed FROM completed GROUP BY loop_id
      ),
      disputes AS (
        SELECT buyer_loop_id AS loop_id, COUNT(*)::INT AS d FROM loop_contracts WHERE status = 'disputed' GROUP BY buyer_loop_id
        UNION ALL
        SELECT seller_loop_id, COUNT(*) FROM loop_contracts WHERE status = 'disputed' GROUP BY seller_loop_id
      ),
      disp_agg AS (
        SELECT loop_id, SUM(d)::INT AS disputes FROM disputes GROUP BY loop_id
      )
      SELECT l.id AS loop_id,
             COALESCE(a.tasks_completed, 0) AS tasks_completed,
             COALESCE(d.disputes, 0) AS disputes,
             COALESCE(l.trust_score, 0) AS trust_score
      FROM loops l
      LEFT JOIN agg a ON a.loop_id = l.id
      LEFT JOIN disp_agg d ON d.loop_id = l.id
      WHERE l.status = 'active' OR a.tasks_completed > 0 OR d.disputes > 0
    `);

    for (const row of r.rows) {
      await pool.query(
        `INSERT INTO agent_metrics (loop_id, tasks_completed, tasks_failed, disputes, trust_score, last_updated)
         VALUES ($1, $2, 0, $3, $4, now())
         ON CONFLICT (loop_id) DO UPDATE SET
           tasks_completed = EXCLUDED.tasks_completed,
           disputes = EXCLUDED.disputes,
           trust_score = EXCLUDED.trust_score,
           last_updated = now()`,
        [row.loop_id, row.tasks_completed || 0, row.disputes || 0, row.trust_score || 0]
      );
    }
    console.log("Aggregated agent_metrics for", r.rows.length, "loops.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
