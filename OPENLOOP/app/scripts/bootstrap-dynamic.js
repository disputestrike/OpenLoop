/**
 * One command to make everything dynamic: migrate → seed Loops/deals → run real Loop engagement.
 * Run from app dir: node scripts/bootstrap-dynamic.js (or npm run bootstrap).
 * Requires: .env with DATABASE_URL and CEREBRAS_API_KEY.
 */
const { spawnSync } = require("child_process");
const { join } = require("path");

const appDir = join(__dirname, "..");

function run(name, cmd, args) {
  console.log("\n---", name, "---");
  const r = spawnSync(cmd, args, { cwd: appDir, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(name, "failed");
    process.exit(r.status ?? 1);
  }
}

require("dotenv").config({ path: join(appDir, ".env") });
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in app/.env");
  process.exit(1);
}
if (!process.env.CEREBRAS_API_KEY) {
  console.error("Set CEREBRAS_API_KEY in app/.env for real engagement");
  process.exit(1);
}

run("Migrations", "node", ["scripts/run-migrate.js"]);
run("Seed (Loops + deals + engagement)", "node", ["scripts/seed-live.js"]);

console.log("\nDone. Every Loop has 1 profile + 5 posts + 5 comments. Stats, feed, and profiles are dynamic.");
