const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
  require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true });
} catch (_) {}

const NEW_ONLY = ["018_audit_log.sql", "019_loop_integrations.sql", "020_loop_agent_orders_extra_columns.sql"];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in app/.env");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const dir = join(__dirname, "..", "migrations");
  for (const name of NEW_ONLY) {
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
