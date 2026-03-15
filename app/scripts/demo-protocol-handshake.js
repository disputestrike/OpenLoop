/**
 * Runnable proof-of-network: two agents complete a full protocol handshake.
 * TASK_REQUEST → TASK_OFFER → TASK_ACCEPT → TASK_COMPLETE → PAYMENT_CONFIRM
 *
 * Usage:
 *   BASE_URL=https://openloop-production.up.railway.app node scripts/demo-protocol-handshake.js
 *   Or with existing API keys: DEMO_API_KEY_BUYER=lk_xxx DEMO_API_KEY_SELLER=lk_yyy BASE_URL=... node scripts/demo-protocol-handshake.js
 *
 * If no keys: script uses DATABASE_URL to create two demo loops and API keys, then runs the handshake.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const BASE = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const BUYER_KEY = process.env.DEMO_API_KEY_BUYER;
const SELLER_KEY = process.env.DEMO_API_KEY_SELLER;

function auth(key) {
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function post(url, body, key) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(key) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log("\n🔵 OpenLoop protocol handshake demo →", BASE, "\n");

  let buyerKey = BUYER_KEY;
  let sellerKey = SELLER_KEY;

  if (!buyerKey || !sellerKey) {
    if (!process.env.DATABASE_URL) {
      console.log("Set DATABASE_URL and run migrations, or set DEMO_API_KEY_BUYER and DEMO_API_KEY_SELLER.");
      console.log("To create demo keys: run this from app dir after seed (seed:marketplace), then:");
      console.log("  Create two Loops in the app, generate API keys in Dashboard for each, then:");
      console.log("  DEMO_API_KEY_BUYER=lk_xxx DEMO_API_KEY_SELLER=lk_yyy BASE_URL=... node scripts/demo-protocol-handshake.js\n");
      process.exit(1);
    }
    const { Pool } = require("pg");
    const crypto = require("crypto");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const ensureLoop = async (tag, domains) => {
      const r = await pool.query(
        `SELECT id FROM loops WHERE lower(loop_tag) = lower($1) LIMIT 1`,
        [tag]
      );
      if (r.rows.length > 0) return r.rows[0].id;
      await pool.query(
        `INSERT INTO loops (loop_tag, status, role, agent_core_domains, trust_score) VALUES ($1, 'active', 'both', $2, 50) ON CONFLICT (loop_tag) DO UPDATE SET status = 'active', agent_core_domains = $2 RETURNING id`,
        [tag, domains]
      );
      const r2 = await pool.query(`SELECT id FROM loops WHERE lower(loop_tag) = lower($1)`, [tag]);
      return r2.rows[0].id;
    };

    const createKey = async (loopId) => {
      const token = "lk_live_demo_" + crypto.randomBytes(24).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await pool.query(
        `CREATE TABLE IF NOT EXISTS loop_api_keys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), loop_id UUID REFERENCES loops(id) ON DELETE CASCADE, name TEXT NOT NULL, prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, revoked BOOLEAN DEFAULT false, last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now())`
      ).catch(() => {});
      await pool.query(
        `INSERT INTO loop_api_keys (loop_id, name, prefix, key_hash) VALUES ($1, 'demo', 'lk_live_demo', $2) ON CONFLICT (key_hash) DO NOTHING`,
        [loopId, hash]
      ).catch(() => {});
      return token;
    };

    try {
      const buyerId = await ensureLoop("DemoBuyer", ["buyer"]);
      const sellerId = await ensureLoop("DemoSeller", ["seller", "task_runner"]);
      buyerKey = await createKey(buyerId);
      sellerKey = await createKey(sellerId);
      console.log("Created demo loops and API keys (DemoBuyer, DemoSeller).\n");
    } catch (e) {
      console.error("DB setup failed:", e.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  let contractId = null;
  let correlationId = "demo_" + Date.now();

  // 1) Buyer sends TASK_REQUEST to Seller
  console.log("1. TASK_REQUEST (buyer → seller)");
  const r1 = await post(
    BASE + "/api/protocol/send",
    { type: "TASK_REQUEST", task: "demo_task", to: "DemoSeller", inputs: { demo: true }, budget: 1000, correlationId },
    buyerKey
  );
  if (!r1.ok) {
    console.log("   FAIL", r1.status, r1.data);
    process.exit(1);
  }
  console.log("   OK", r1.data.eventId);
  if (r1.data.contractId) contractId = r1.data.contractId;

  console.log("2. TASK_OFFER (seller → buyer)");
  const r2 = await post(
    BASE + "/api/protocol/send",
    { type: "TASK_OFFER", task: "demo_task", to: "DemoBuyer", proposedValue: "$10", rewardAmountCents: 1000, contractId, correlationId },
    sellerKey
  );
  if (!r2.ok) {
    console.log("   FAIL", r2.status, r2.data);
    process.exit(1);
  }
  console.log("   OK", r2.data.eventId);

  console.log("3. TASK_ACCEPT (buyer)");
  const r3 = await post(
    BASE + "/api/protocol/send",
    { type: "TASK_ACCEPT", contractId: contractId || "unknown", correlationId },
    buyerKey
  );
  if (!r3.ok) {
    console.log("   FAIL", r3.status, r3.data);
    process.exit(1);
  }
  console.log("   OK", r3.data.eventId);

  console.log("4. TASK_COMPLETE (seller)");
  const r4 = await post(
    BASE + "/api/protocol/send",
    { type: "TASK_COMPLETE", contractId: contractId || "unknown", outcome: "Demo task completed.", correlationId },
    sellerKey
  );
  if (!r4.ok) {
    console.log("   FAIL", r4.status, r4.data);
    process.exit(1);
  }
  console.log("   OK", r4.data.eventId);

  console.log("5. PAYMENT_CONFIRM (buyer)");
  const r5 = await post(
    BASE + "/api/protocol/send",
    { type: "PAYMENT_CONFIRM", contractId: contractId || "unknown", amountCents: 1000, correlationId },
    buyerKey
  );
  if (!r5.ok) {
    console.log("   FAIL", r5.status, r5.data);
    process.exit(1);
  }
  console.log("   OK", r5.data.eventId);

  console.log("\n✅ Protocol handshake complete. Two agents completed a task through the network.\n");

  if (process.env.DATABASE_URL && contractId) {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const r = await pool.query(
        `SELECT buyer_loop_id, seller_loop_id FROM loop_contracts WHERE id = $1`,
        [contractId]
      );
      const agentsInvolved = r.rows[0] ? [r.rows[0].buyer_loop_id, r.rows[0].seller_loop_id] : [];
      await pool.query(
        `INSERT INTO sandbox_simulations (scenario_type, agents_involved, outcome, payload) VALUES ($1, $2, $3, $4)`,
        ["protocol_handshake", agentsInvolved, "success", JSON.stringify({ correlationId, contractId, steps: 5 })]
      );
      await pool.end();
    } catch (_) {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
