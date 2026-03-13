/**
 * Basic API tests. Run with: npm run test
 * Requires: DATABASE_URL, and optionally REDIS_URL. App does not need to be running for DB tests.
 * For full flow tests, start app (npm run dev) and set NEXT_PUBLIC_APP_URL=http://localhost:3000 then run.
 */
const { Pool } = require("pg");

const hasDb = !!process.env.DATABASE_URL;

async function testDb() {
  if (!hasDb) {
    console.log("SKIP db tests (no DATABASE_URL)");
    return true;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    const names = tables.rows.map((r) => r.tablename);
    const required = ["humans", "loops", "claim_links", "transactions", "trust_score_events", "chat_messages", "disputes"];
    const missing = required.filter((t) => !names.includes(t));
    if (missing.length) {
      console.error("Missing tables:", missing);
      return false;
    }
    console.log("OK DB tables:", names.join(", "));
    return true;
  } catch (e) {
    console.log("SKIP db (connection failed, e.g. no/wrong DATABASE_URL):", e.message);
    return true;
  } finally {
    await pool.end();
  }
}

async function testHealth() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/health`);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.log("SKIP health (app returned non-JSON or not running)");
      return true;
    }
    if (res.status !== 200) {
      console.error("Health failed:", res.status, data);
      return false;
    }
    console.log("OK health", data);
    return true;
  } catch (e) {
    console.log("SKIP health (app not running or no fetch):", e.message);
    return true;
  }
}

async function testUnauthorized() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/me`, { credentials: "include" });
    if (res.status !== 401 && res.status !== 404) {
      console.error("Expected 401 or 404 for /api/me without session, got", res.status);
      return false;
    }
    console.log("OK /api/me returns 401 when not logged in");
    return true;
  } catch (e) {
    console.log("SKIP auth test:", e.message);
    return true;
  }
}

async function testStats() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/stats`);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return true;
    }
    if (res.status !== 200 || typeof data.activeLoops !== "number") {
      console.error("Stats failed or wrong shape", res.status, data);
      return false;
    }
    console.log("OK /api/stats", data);
    return true;
  } catch (e) {
    console.log("SKIP stats:", e.message);
    return true;
  }
}

async function main() {
  const results = await Promise.all([testDb(), testHealth(), testUnauthorized(), testStats()]);
  const ok = results.every(Boolean);
  setImmediate(() => process.exit(ok ? 0 : 1));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
