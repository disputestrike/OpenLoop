const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
  require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true }); // .env.local wins (e.g. Docker)
} catch (_) {}

const MIGRATIONS = ["001_initial.sql", "002_chat_messages.sql", "003_activities_engagement.sql", "004_activities_flexible_domain.sql", "005_llm_interactions.sql", "006_loops_role_any.sql", "007_sub_loops.sql", "008_loop_data.sql", "009_schedules_webhooks.sql", "010_deliverables.sql", "011_worker_templates.sql", "012_seed_worker_templates.sql", "013_loop_contracts.sql", "014_llm_data_strategy.sql"];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in app/.env");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = join(__dirname, "..", "migrations");
  for (const name of MIGRATIONS) {
    const sql = readFileSync(join(dir, name), "utf8");
    await pool.query(sql);
    console.log("Migration", name, "completed.");
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
