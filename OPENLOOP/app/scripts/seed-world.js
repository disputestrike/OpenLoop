/**
 * Seed the world: many buyers, sellers, mixed — different interests, roles, trust.
 * Every Loop gets a unique loop_tag so they can walk. All sandbox. Then let them run.
 *
 * Run: node scripts/seed-world.js  (from app dir)
 * Env: SEED_BUYERS=50000 SEED_SELLERS=50000  (default 5000 each)
 *      Or SEED_TOTAL=100000 for 50k buyers + 50k sellers
 *      Or SEED_TOTAL=1000000 for 500k + 500k (run in batches, takes time)
 */
const { Pool } = require("pg");
const { randomInt } = require("crypto");
const { join } = require("path");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
} catch (_) {}

const ROLES = ["buyer", "seller", "both"];
const SKILLS = [
  ["bill_negotiation"],
  ["scheduling"],
  ["refunds"],
  ["bill_negotiation", "scheduling"],
  ["scheduling", "refunds"],
  ["bill_negotiation", "refunds"],
  ["bill_negotiation", "scheduling", "refunds"],
];
const BATCH = 2000;

function pick(arr) {
  return arr[randomInt(0, arr.length)];
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }

  const total = parseInt(process.env.SEED_TOTAL || "0", 10);
  let numBuyers = parseInt(process.env.SEED_BUYERS || "5000", 10);
  let numSellers = parseInt(process.env.SEED_SELLERS || "5000", 10);
  if (total > 0) {
    numBuyers = Math.floor(total / 2);
    numSellers = total - numBuyers;
  }

  console.log("Seeding world:", numBuyers, "buyers +", numSellers, "sellers (all with loop_tag so they can walk)...");

  const client = await pool.connect();
  try {
    for (let offset = 0; offset < numBuyers; offset += BATCH) {
      const batchSize = Math.min(BATCH, numBuyers - offset);
      const values = [];
      const params = [];
      let p = 0;
      for (let i = 0; i < batchSize; i++) {
        const tag = `B-${offset + i + 1}`;
        const trustScore = randomInt(25, 96);
        const skills = pick(SKILLS);
        values.push(`($${++p}, 'unclaimed', 'buyer', $${++p}, 100000, $${++p}::jsonb, now())`);
        params.push(tag, trustScore, JSON.stringify(skills));
      }
      await client.query(
        `INSERT INTO loops (loop_tag, status, role, trust_score, sandbox_balance_cents, skills, updated_at) VALUES ${values.join(", ")} ON CONFLICT (loop_tag) DO NOTHING`,
        params
      );
      if ((offset + batchSize) % 10000 === 0 || offset + batchSize === numBuyers) console.log("  Buyers:", offset + batchSize);
    }
    console.log("  Buyers done:", numBuyers);

    for (let offset = 0; offset < numSellers; offset += BATCH) {
      const batchSize = Math.min(BATCH, numSellers - offset);
      const values = [];
      const params = [];
      let p = 0;
      for (let i = 0; i < batchSize; i++) {
        const tag = `S-${offset + i + 1}`;
        const trustScore = randomInt(25, 96);
        const skills = pick(SKILLS);
        values.push(`($${++p}, 'unclaimed', 'seller', $${++p}, 100000, $${++p}::jsonb, now())`);
        params.push(tag, trustScore, JSON.stringify(skills));
      }
      await client.query(
        `INSERT INTO loops (loop_tag, status, role, trust_score, sandbox_balance_cents, skills, updated_at) VALUES ${values.join(", ")} ON CONFLICT (loop_tag) DO NOTHING`,
        params
      );
      if ((offset + batchSize) % 10000 === 0 || offset + batchSize === numSellers) console.log("  Sellers:", offset + batchSize);
    }
    console.log("  Sellers done:", numSellers);

    const bothCount = Math.min(5000, Math.floor((numBuyers + numSellers) / 20));
    for (let offset = 0; offset < bothCount; offset += BATCH) {
      const batchSize = Math.min(BATCH, bothCount - offset);
      const values = [];
      const params = [];
      let p = 0;
      for (let i = 0; i < batchSize; i++) {
        const tag = `A-${offset + i + 1}`;
        const trustScore = randomInt(30, 95);
        const skills = pick(SKILLS);
        values.push(`($${++p}, 'unclaimed', 'both', $${++p}, 100000, $${++p}::jsonb, now())`);
        params.push(tag, trustScore, JSON.stringify(skills));
      }
      await client.query(
        `INSERT INTO loops (loop_tag, status, role, trust_score, sandbox_balance_cents, skills, updated_at) VALUES ${values.join(", ")} ON CONFLICT (loop_tag) DO NOTHING`,
        params
      );
    }
    console.log("  Both (mixed):", bothCount);

    const totalLoops = numBuyers + numSellers + bothCount;
    console.log("Done. Total Loops in world:", totalLoops, "— all can walk. Run: npm run loops:walk");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
