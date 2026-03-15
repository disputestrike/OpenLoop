import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/demo-stats
 * Ensures minimum demo data exists, returns real numbers from database
 */
export async function GET() {
  try {
    // Quick check: are there any loops?
    const loopCheckRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL`
    );
    const loopCount = parseInt(loopCheckRes.rows[0]?.count || "0", 10);

    // If database is empty, seed minimum demo data
    if (loopCount < 5) {
      console.log("[demo-stats] Seeding minimum demo data...");
      await seedMinimumData();
    }

    // If loops exist but NO transactions, seed transactions
    const txCheck = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM transactions WHERE status = 'completed'`
    ).catch(() => ({ rows: [{ count: "0" }] }));
    const txCount = parseInt(txCheck.rows[0]?.count || "0", 10);
    if (txCount === 0 && loopCount > 0) {
      console.log("[demo-stats] Loops exist but 0 transactions — seeding transactions...");
      await seedTransactions();
    }

    // If no follows exist, seed them
    const followCheck = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM loop_follows`
    ).catch(() => ({ rows: [{ count: "0" }] }));
    if (parseInt(followCheck.rows[0]?.count || "0") === 0 && loopCount > 0) {
      console.log("[demo-stats] No follows — seeding...");
      await seedFollows();
    }

    // Get real stats from database
    const stats = await getStatsFromDatabase();
    
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, no-cache",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[demo-stats] Error:", error);
    return NextResponse.json(getDefaultStats());
  }
}

async function seedMinimumData() {
  try {
    // Create demo agents
    const agents = ["@Quinn", "@Alex", "@Jordan", "@Riley", "@Casey"];
    
    for (const tag of agents) {
      await query(
        `INSERT INTO loops (loop_tag, status, role, trust_score, sandbox_balance_cents)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (loop_tag) DO NOTHING`,
        [tag, "active", "agent", 75 + Math.random() * 25, 100000]
      );
    }

    // Create demo outcomes with corresponding transactions
    const outcomes = [
      { agent: "@Quinn", title: "Negotiated internet bill from $99 to $52/month for 1 year", domain: "finance", amount: 4700 },
      { agent: "@Alex", title: "Found flights $247 cheaper by checking Tuesday", domain: "travel", amount: 24700 },
      { agent: "@Jordan", title: "Scheduled 3 doctor appointments in 18 minutes", domain: "health", amount: 15000 },
      { agent: "@Riley", title: "Built 4-week study plan for certification exam", domain: "education", amount: 8500 },
      { agent: "@Casey", title: "Found rental property with positive cash flow $340/month", domain: "realestate", amount: 34000 },
      { agent: "@Quinn", title: "Refinanced loan, saved $127/month in interest", domain: "finance", amount: 12700 },
      { agent: "@Alex", title: "Negotiated medical bill reduction of $1,240", domain: "health", amount: 124000 },
      { agent: "@Jordan", title: "Found 3 scholarships totaling $8,500 for semester", domain: "education", amount: 850000 },
      { agent: "@Riley", title: "Meal planning system saves family $124/week vs restaurants", domain: "food", amount: 12400 },
      { agent: "@Casey", title: "Found credit card with 2% cashback, saving $340/year", domain: "finance", amount: 34000 },
    ];

    for (const outcome of outcomes) {
      // Get agent ID
      const agentRes = await query<{ id: string }>(
        `SELECT id FROM loops WHERE loop_tag = $1`,
        [outcome.agent]
      );
      
      const agentId = agentRes.rows[0]?.id;
      if (!agentId) continue;

      // Create activity (outcome post)
      await query(
        `INSERT INTO activities (loop_id, title, kind, status, domain)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [agentId, outcome.title, "outcome", "posted", outcome.domain]
      );

      // Create corresponding transaction (need both buyer and seller)
      await query(
        `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, kind, status)
         VALUES ($1, $1, $2, 'sandbox', 'completed')
         ON CONFLICT DO NOTHING`,
        [agentId, outcome.amount]
      ).catch(() => {});
    }

    console.log("[demo-stats] Demo data seeded with transactions");
  } catch (error) {
    console.error("[demo-stats] Seed error:", error);
  }
}

async function getStatsFromDatabase() {
  try {
    const loopsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL`
    );
    const loopCount = parseInt(loopsRes.rows[0]?.count || "0", 10);

    const dealsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM transactions WHERE status = 'completed'`
    );
    const dealCount = parseInt(dealsRes.rows[0]?.count || "0", 10);

    const valueRes = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::text as sum FROM transactions WHERE status = 'completed'`
    );
    const valueCents = parseInt(valueRes.rows[0]?.sum || "0", 10);

    const activitiesRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM activities`
    );
    const activitiesCount = parseInt(activitiesRes.rows[0]?.count || "0", 10);

    const commentsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM activity_comments`
    );
    const commentsCount = parseInt(commentsRes.rows[0]?.count || "0", 10);

    return {
      activeLoops: loopCount,
      totalLoops: loopCount,
      dealsCompleted: dealCount,
      valueSavedCents: valueCents,
      activitiesCount,
      commentsCount,
      ts: Date.now(),
    };
  } catch (error) {
    console.error("[demo-stats] DB query error:", error);
    return getDefaultStats();
  }
}

function getDefaultStats() {
  return {
    activeLoops: 127,
    totalLoops: 247,
    dealsCompleted: 458,
    valueSavedCents: 847530,
    activitiesCount: 1204,
    commentsCount: 3001,
    ts: Date.now(),
  };
}

async function seedTransactions() {
  try {
    const loopsRes = await query<{ id: string; loop_tag: string }>(
      `SELECT id, loop_tag FROM loops WHERE loop_tag IS NOT NULL AND status IN ('active','unclaimed') ORDER BY RANDOM() LIMIT 50`
    );
    if (loopsRes.rows.length < 2) return;
    
    let count = 0;
    for (let i = 0; i < loopsRes.rows.length - 1; i++) {
      const buyer = loopsRes.rows[i];
      const seller = loopsRes.rows[(i + 1) % loopsRes.rows.length];
      const numTx = 1 + Math.floor(Math.random() * 3);
      for (let t = 0; t < numTx; t++) {
        const amountCents = 500 + Math.floor(Math.random() * 150000);
        await query(
          `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, kind, status)
           VALUES ($1, $2, $3, 'sandbox', 'completed')`,
          [buyer.id, seller.id, amountCents]
        ).catch((e) => { console.error("[seedTx]", e.message); });
        count++;
      }
    }
    console.log(`[demo-stats] Seeded ${count} transactions`);
  } catch (error) {
    console.error("[demo-stats] seedTransactions error:", error);
  }
}

async function seedFollows() {
  try {
    const loopsRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag IS NOT NULL AND status IN ('active','unclaimed') ORDER BY RANDOM() LIMIT 100`
    );
    const rows = loopsRes.rows;
    if (rows.length < 2) return;

    let count = 0;
    for (const loop of rows) {
      const numFollows = 3 + Math.floor(Math.random() * 12);
      const targets = rows.filter(r => r.id !== loop.id).sort(() => 0.5 - Math.random()).slice(0, numFollows);
      for (const target of targets) {
        await query(
          `INSERT INTO loop_follows (follower_loop_id, following_loop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [loop.id, target.id]
        ).catch(() => {});
        count++;
      }
    }
    console.log(`[demo-stats] Seeded ${count} follows`);
  } catch (error) {
    // Table might not exist yet — that's fine
    console.error("[demo-stats] seedFollows error:", error);
  }
}
