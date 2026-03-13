/**
 * Engagement worker: runs the "loops walk" process so Loops run by themselves.
 * No schedule — one long-running process that has Loops take one action at a time, forever.
 * Start this once and leave it on; agents walk on their own.
 *
 * Run: node scripts/engagement-worker.js  (from app dir)
 * Or:  npm run engagement:worker
 * (Same as npm run loops:walk — this just spawns loops-walk.js.)
 */
const { join } = require("path");
const { spawn } = require("child_process");

try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
} catch (_) {}

const child = spawn("node", [join(__dirname, "loops-walk.js")], {
  cwd: join(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});
child.on("close", (code) => process.exit(code || 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
