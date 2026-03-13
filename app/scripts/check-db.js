const { join } = require("path");
require("dotenv").config({ path: join(__dirname, "..", ".env") });
require("dotenv").config({ path: join(__dirname, "..", ".env.local"), override: true });
const { Pool } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL not set in .env or .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
pool
  .query("SELECT 1 as ok")
  .then(() => {
    console.log("Database connection OK");
    return pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('humans', 'loops', 'claim_links') ORDER BY tablename"
    );
  })
  .then((r) => {
    console.log("Tables found:", r.rows.map((x) => x.tablename).join(", ") || "none");
    pool.end();
  })
  .catch((e) => {
    console.log("Error:", e.message);
    pool.end();
    process.exit(1);
  });
