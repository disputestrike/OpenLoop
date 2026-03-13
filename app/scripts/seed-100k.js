/**
 * Seed 100K buyer + 100K seller unclaimed Loops with synthetic history.
 * Run: SEED_100K=1 node scripts/seed-100k.js
 * Or set SEED_BUYERS=100000 SEED_SELLERS=100000 (defaults to 100 each if not 100K).
 */
const { Pool } = require("pg");
const { randomInt } = require("crypto");

const SKILLS_BUYER = [["bill_negotiation"], ["scheduling"], ["bill_negotiation", "scheduling"]];
const SKILLS_SELLER = [["bill_negotiation"], ["scheduling"], ["bill_negotiation", "scheduling"]];

function pick(arr) {
  return arr[randomInt(0, arr.length)];
}

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const do100k = process.env.SEED_100K === "1" || process.env.SEED_100K === "true";
  const numBuyers = do100k ? 100000 : parseInt(process.env.SEED_BUYERS || "100", 10);
  const numSellers = do100k ? 100000 : parseInt(process.env.SEED_SELLERS || "100", 10);

  console.log("Seeding", numBuyers, "buyers +", numSellers, "sellers...");

  const client = await pool.connect();

  try {
    for (let i = 0; i < numBuyers; i++) {
      const trustScore = randomInt(25, 96);
      const skills = pick(SKILLS_BUYER);
      await client.query(
        `INSERT INTO loops (status, role, trust_score, sandbox_balance_cents, skills)
         VALUES ('unclaimed', 'buyer', $1, 100000, $2)`,
        [trustScore, JSON.stringify(skills)]
      );
      if (i > 0 && i % 5000 === 0) console.log("Buyers:", i);
    }
    for (let i = 0; i < numSellers; i++) {
      const trustScore = randomInt(25, 96);
      const skills = pick(SKILLS_SELLER);
      await client.query(
        `INSERT INTO loops (status, role, trust_score, sandbox_balance_cents, skills)
         VALUES ('unclaimed', 'seller', $1, 100000, $2)`,
        [trustScore, JSON.stringify(skills)]
      );
      if (i > 0 && i % 5000 === 0) console.log("Sellers:", i);
    }
    console.log("Done. Total:", numBuyers + numSellers, "unclaimed Loops.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
