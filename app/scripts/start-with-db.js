/**
 * Start Next.js with DATABASE_URL set to Docker DB so the app always has data.
 * Run from repo root: node app/scripts/start-with-db.js
 * Or from app/: node scripts/start-with-db.js
 */
const { join } = require("path");
const { spawn } = require("child_process");

require("dotenv").config({ path: join(__dirname, "..", ".env") });
require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true });

const DOCKER_DB = "postgresql://postgres:postgres@localhost:5433/openloop";
process.env.DATABASE_URL = process.env.DATABASE_URL || DOCKER_DB;
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3020";

const nextBin = join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const next = spawn(process.execPath, [nextBin, "dev", "-p", "3020"], {
  cwd: join(__dirname, ".."),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
});

next.on("error", (err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
next.on("exit", (code) => process.exit(code ?? 0));
