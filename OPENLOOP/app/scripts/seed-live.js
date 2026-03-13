/**
 * Seed data so Directory and Activity show real Loops and deals.
 * Run after migrations: npm run db:seed-live (loads app/.env)
 */
const { Pool } = require("pg");
const { join } = require("path");
try {
  require("dotenv").config({ path: join(__dirname, "..", ".env") });
} catch (_) {}

const HUMANS = [
  { id: "a0000001-0000-4000-8000-000000000001", email: "marcus@example.com" },
  { id: "a0000001-0000-4000-8000-000000000002", email: "alex@example.com" },
  { id: "a0000001-0000-4000-8000-000000000003", email: "sam@example.com" },
  { id: "a0000001-0000-4000-8000-000000000004", email: "jordan@example.com" },
  { id: "a0000001-0000-4000-8000-000000000005", email: "casey@example.com" },
  { id: "a0000001-0000-4000-8000-000000000006", email: "riley@example.com" },
  { id: "a0000001-0000-4000-8000-000000000007", email: "taylor@example.com" },
  { id: "a0000001-0000-4000-8000-000000000008", email: "quinn@example.com" },
];

const ACTIVE_LOOPS = [
  { id: "b0000001-0000-4000-8000-000000000001", humanId: HUMANS[0].id, tag: "Marcus", email: HUMANS[0].email, role: "buyer", trust: 87 },
  { id: "b0000001-0000-4000-8000-000000000002", humanId: HUMANS[1].id, tag: "Alex", email: HUMANS[1].email, role: "both", trust: 92 },
  { id: "b0000001-0000-4000-8000-000000000003", humanId: HUMANS[2].id, tag: "Sam", email: HUMANS[2].email, role: "seller", trust: 78 },
  { id: "b0000001-0000-4000-8000-000000000004", humanId: HUMANS[3].id, tag: "Jordan", email: HUMANS[3].email, role: "buyer", trust: 94 },
  { id: "b0000001-0000-4000-8000-000000000005", humanId: HUMANS[4].id, tag: "Casey", email: HUMANS[4].email, role: "seller", trust: 81 },
  { id: "b0000001-0000-4000-8000-000000000006", humanId: HUMANS[5].id, tag: "Riley", email: HUMANS[5].email, role: "both", trust: 89 },
  { id: "b0000001-0000-4000-8000-000000000007", humanId: HUMANS[6].id, tag: "Taylor", email: HUMANS[6].email, role: "buyer", trust: 75 },
  { id: "b0000001-0000-4000-8000-000000000008", humanId: HUMANS[7].id, tag: "Quinn", email: HUMANS[7].email, role: "seller", trust: 96 },
];

// Unclaimed Loops — so "Find a Loop" on claim-flow can match (Bills, Scheduling, Any)
const UNCLAIMED_LOOPS = [
  { id: "c0000001-0000-4000-8000-000000000001", tag: "Loop-Bills-1", role: "buyer", trust: 72, skills: ["bill_negotiation"] },
  { id: "c0000001-0000-4000-8000-000000000002", tag: "Loop-Sched-1", role: "buyer", trust: 68, skills: ["scheduling"] },
  { id: "c0000001-0000-4000-8000-000000000003", tag: "Loop-Any-1", role: "both", trust: 80, skills: ["bill_negotiation", "scheduling"] },
];

const DEALS = [
  [1, 3, 4750], [2, 5, 3200], [4, 8, 8100], [1, 5, 1890], [6, 3, 5600],
  [7, 8, 4200], [2, 3, 2900], [4, 5, 6700], [1, 8, 3400], [6, 5, 5100],
  [7, 3, 2300], [2, 8, 7800], [4, 3, 4100], [1, 5, 6200], [6, 8, 3900],
  [7, 5, 5400], [2, 3, 2100], [4, 8, 8900], [1, 3, 1500], [6, 5, 7200],
];

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL");
    process.exit(1);
  }

  for (const h of HUMANS) {
    await pool.query(
      `INSERT INTO humans (id, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET updated_at = now()`,
      [h.id, h.email]
    );
  }
  console.log("Humans:", HUMANS.length);

  for (const l of ACTIVE_LOOPS) {
    await pool.query(
      `INSERT INTO loops (id, human_id, loop_tag, email, status, role, trust_score, sandbox_balance_cents, claimed_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $6, 90000, now() - interval '2 days', now())
       ON CONFLICT (id) DO UPDATE SET loop_tag = EXCLUDED.loop_tag, status = 'active', trust_score = EXCLUDED.trust_score`,
      [l.id, l.humanId, l.tag, l.email, l.role, l.trust]
    );
  }
  console.log("Active Loops:", ACTIVE_LOOPS.length);

  for (const l of UNCLAIMED_LOOPS) {
    await pool.query(
      `INSERT INTO loops (id, loop_tag, status, role, trust_score, sandbox_balance_cents, skills, updated_at)
       VALUES ($1, $2, 'unclaimed', $3, $4, 100000, $5::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET status = 'unclaimed', trust_score = EXCLUDED.trust_score, skills = EXCLUDED.skills`,
      [l.id, l.tag, l.role, l.trust, JSON.stringify(l.skills)]
    );
  }
  console.log("Unclaimed Loops:", UNCLAIMED_LOOPS.length);

  const buyers = ACTIVE_LOOPS.filter((l) => l.role === "buyer" || l.role === "both").map((l) => l.id);
  const sellers = ACTIVE_LOOPS.filter((l) => l.role === "seller" || l.role === "both").map((l) => l.id);
  let txCount = 0;
  for (let i = 0; i < DEALS.length; i++) {
    const [bi, si, amt] = DEALS[i];
    const buyerId = ACTIVE_LOOPS[bi - 1].id;
    const sellerId = ACTIVE_LOOPS[si - 1].id;
    if (buyerId === sellerId) continue;
    await pool.query(
      `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at, created_at)
       VALUES ($1, $2, $3, 'USD', 'sandbox', 'completed', now() - ($4 || ' minutes')::interval, now() - ($4 || ' minutes')::interval)`,
      [buyerId, sellerId, amt, (i + 1) * 3]
    );
    txCount++;
  }
  console.log("Transactions:", txCount);
  await pool.end();

  if (process.env.CEREBRAS_API_KEY) {
    console.log("Running engagement: every Loop gets 1 profile + 5 posts + 5 comments...");
    const { spawnSync } = require("child_process");
    const r = spawnSync("node", [join(__dirname, "daily-loop-engagement.js")], {
      cwd: join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
    if (r.status !== 0) {
      console.error("Engagement script exited with", r.status);
      process.exit(r.status || 1);
    }
    console.log("Engagement done. You should see comments and posts from every Loop.");
  } else {
    console.log("Skipping engagement (set CEREBRAS_API_KEY in .env to run it). Run: npm run engagement");
  }

  console.log("Done. Open /directory and homepage to see Loops, activity, and comments.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
