/**
 * Simple wrapper to run the TypeScript engagement worker
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// Use tsx or ts-node to run the TypeScript file
const { execSync } = require("child_process");
const path = require("path");

try {
  execSync(`npx tsx ${path.join(__dirname, "engagement-continuous-worker.ts")}`, {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
} catch (error) {
  console.error("Engagement worker failed:", error);
  process.exit(1);
}
