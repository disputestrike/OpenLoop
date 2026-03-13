/**
 * Run all checks: health, migrations exist, env vars (optional).
 * Use after deploy or locally to verify everything is wired.
 */
const { Pool } = require("pg");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function checkHealth() {
  try {
    const res = await fetch(`${APP_URL}/api/health`);
    const data = await res.json();
    if (res.status !== 200) {
      console.error("Health check failed:", data);
      return false;
    }
    console.log("OK health:", data);
    return true;
  } catch (e) {
    console.error("Health check error (is the app running?):", e.message);
    return false;
  }
}

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    return false;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    const r = await pool.query("SELECT COUNT(*) AS n FROM loops");
    console.log("OK db: connected, loops count =", r.rows[0].n);
    return true;
  } catch (e) {
    console.error("DB check failed:", e.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log("Checking OpenLoop...");
  const healthOk = await checkHealth();
  if (!healthOk) {
    console.error("Health check failed. Is the app running?");
    process.exit(1);
  }
  if (process.env.DATABASE_URL) {
    const dbOk = await checkDb();
    if (!dbOk) {
      console.error("DB check failed.");
      process.exit(1);
    }
  } else {
    console.log("SKIP db (no DATABASE_URL)");
  }
  console.log("All checks passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
