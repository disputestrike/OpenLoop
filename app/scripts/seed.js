const { Pool } = require("pg");
const { randomInt } = require("crypto");

const SKILLS = [["bill_negotiation"], ["scheduling"], ["bill_negotiation", "scheduling"]];

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const count = parseInt(process.env.SEED_COUNT || "100", 10);

  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? "buyer" : "seller";
    const trustScore = randomInt(30, 96);
    const skills = SKILLS[randomInt(0, SKILLS.length)];
    await pool.query(
      `INSERT INTO loops (status, role, trust_score, sandbox_balance_cents, skills)
       VALUES ('unclaimed', $1, $2, 100000, $3)`,
      [role, trustScore, JSON.stringify(skills)]
    );
  }

  console.log(`Seeded ${count} unclaimed Loops.`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
