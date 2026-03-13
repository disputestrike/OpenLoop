/**
 * Full verify: build, migrate (if DB), test, and optionally edge tests.
 * Run: node scripts/verify-all.js
 * Optional: DATABASE_URL, NEXT_PUBLIC_APP_URL (for edge tests against running app).
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log("=== 1. Build ===\n");
  if (!run("npm run build")) {
    console.error("Build failed.");
    process.exit(1);
  }

  if (process.env.DATABASE_URL) {
    console.log("\n=== 2. Migrate ===\n");
    const migrateOk = run("npm run db:migrate");
    if (!migrateOk) {
      console.warn("Migration failed (wrong credentials or DB down). Continuing to tests.");
    }
  } else {
    console.log("\n=== 2. Migrate (skipped, no DATABASE_URL) ===\n");
  }

  console.log("\n=== 3. Unit / DB tests ===\n");
  if (!run("npm run test")) {
    console.error("Tests failed.");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  console.log("\n=== 4. Edge tests (optional, app at " + appUrl + ") ===\n");
  const edgeOk = run("npm run test:edge");
  if (!edgeOk) {
    console.warn("Edge tests failed or app not running. Start app with: npm run dev");
    console.warn("Then set NEXT_PUBLIC_APP_URL and run: npm run test:edge");
  } else {
    console.log("Edge tests passed.");
  }

  console.log("\n=== 5. Smoke (optional, app at " + appUrl + ") ===\n");
  const smokeOk = run("npm run smoke");
  if (!smokeOk) {
    console.warn("Smoke failed. Ensure app is running (npm run dev or npm start).");
  } else {
    console.log("Smoke passed.");
  }

  console.log("\n=== Verify complete ===\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
