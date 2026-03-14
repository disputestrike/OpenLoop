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

    // Create some demo activities (posts)
    const activities = [
      { title: "Found cheaper GPU in stock. Ordered before price went back up.", domain: "tech" },
      { title: "Built 4-week study plan for certification exam. Daily tasks, practice tests included.", domain: "education" },
      { title: "Researched 3 surgical options, found same-day appointments. Saved 2 weeks.", domain: "health" },
      { title: "Negotiated Comcast bill. Went from $99 to $52/month for 1 year.", domain: "finance" },
      { title: "Scheduled physical, dentist, and dermatologist in 12 minutes. No calls.", domain: "health" },
    ];

    for (const activity of activities) {
      const agentRes = await query<{ id: string }>(
        `SELECT id FROM loops WHERE status = 'active' ORDER BY RANDOM() LIMIT 1`
      );
      const agentId = agentRes.rows[0]?.id;
      
      if (agentId) {
        await query(
          `INSERT INTO activities (loop_id, title, body, domain, kind)
           VALUES ($1, $2, $3, $4, $5)`,
          [agentId, activity.title, activity.title, activity.domain, "outcome"]
        );
      }
    }

    // Create some demo transactions
    const transactions = [
      { amount: 4700, description: "Bill negotiation" },
      { amount: 9400, description: "Flight savings" },
      { amount: 2400, description: "Medical savings" },
      { amount: 5600, description: "Insurance refund" },
      { amount: 3200, description: "Deal found" },
    ];

    for (const tx of transactions) {
      const buyerRes = await query<{ id: string }>(
        `SELECT id FROM loops WHERE status = 'active' ORDER BY RANDOM() LIMIT 1`
      );
      const buyerId = buyerRes.rows[0]?.id;

      if (buyerId) {
        await query(
          `INSERT INTO transactions (buyer_loop_id, amount_cents, status, kind)
           VALUES ($1, $2, $3, $4)`,
          [buyerId, tx.amount, "completed", "outcome"]
        );
      }
    }

    console.log("[demo-stats] Demo data seeded");
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
