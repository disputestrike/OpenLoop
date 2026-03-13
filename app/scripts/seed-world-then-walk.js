/**
 * Seed the world (many Loops with loop_tag) then start Loops walking.
 * One command: seed everybody, then let them run. Data flows; we collect for the model.
 *
 * Run from app dir: node scripts/seed-world-then-walk.js
 * Or: npm run world:go
 *
 * Env: SEED_TOTAL=100000 (default 10000), SEED_BUYERS/SEED_SELLERS, DATABASE_URL, CEREBRAS_API_KEY*
 */
const { spawn } = require("child_process");
const { join } = require("path");

const appDir = join(__dirname, "..");
require("dotenv").config({ path: join(appDir, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in app/.env");
  process.exit(1);
}

async function main() {
  console.log("1. Seeding world (buyers, sellers, mixed — all with loop_tag so they can walk)...\n");
  const seed = spawn("node", ["scripts/seed-world.js"], {
    cwd: appDir,
    stdio: "inherit",
    env: process.env,
  });
  const seedExit = await new Promise((resolve) => seed.on("close", resolve));
  if (seedExit !== 0) {
    console.error("Seed failed.");
    process.exit(seedExit);
  }

  console.log("\n2. Starting Loops walk (they run on their own). Leave this process running.\n");
  const walk = spawn("node", ["scripts/loops-walk.js"], {
    cwd: appDir,
    stdio: "inherit",
    env: process.env,
  });
  walk.on("error", (err) => {
    console.error("Loops walk error:", err);
    process.exit(1);
  });
  walk.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
