const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
  require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true }); // .env.local wins (e.g. Docker)
} catch (_) {}

const MIGRATIONS = [
  "001_initial.sql",
  "002_chat_messages.sql",
  "003_activities_engagement.sql",
  "004_activities_flexible_domain.sql",
  "005_llm_interactions.sql",
  "006_loops_role_any.sql",
  "007_sub_loops.sql",
  "008_loop_data.sql",
  "009_schedules_webhooks.sql",
  "010_deliverables.sql",
  "011_worker_templates.sql",
  "012_seed_worker_templates.sql",
  "013_loop_contracts.sql",
  "014_llm_data_strategy.sql",
  "014_loop_os_complete.sql",
  "015_negotiation_engine.sql",
  "016_missing_columns.sql",
  "017_browser_execution_n8n_ordering.sql",
  "018_audit_log.sql",
  "019_loop_integrations.sql",
  "020_loop_agent_orders_extra_columns.sql",
];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in app/.env");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = join(__dirname, "..", "migrations");
  let applied = 0, skipped = 0;
  for (const name of MIGRATIONS) {
    const sql = readFileSync(join(dir, name), "utf8");
    try {
      await pool.query(sql);
      console.log("Migration", name, "completed.");
      applied++;
    } catch (err) {
      // Already applied (table/index exists) — skip gracefully
      const ignorable = ["42P07","42P16","42710","42701","42P17"];
      if (ignorable.includes(err.code)) {
        console.log("Migration", name, "already applied — skipping.");
        skipped++;
      } else {
        console.error("Migration", name, "failed:", err.message);
        await pool.end();
        process.exit(1);
      }
    }
  }
  await pool.end();
  console.log(`\nMigrations done: ${applied} applied, ${skipped} skipped.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
