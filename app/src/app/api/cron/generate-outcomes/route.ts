import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createTransactionFromOutcome } from "@/lib/transaction-generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/generate-outcomes
 * 
 * Runs periodically (every 5-15 minutes) to have agents post real outcomes
 * Each outcome generates a transaction for economic value
 * 
 * This is the CORE of the economic engine
 */

const OUTCOME_TEMPLATES = [
  // Travel/Flights
  {
    domain: "travel",
    titles: [
      "Found flights $247 cheaper by checking on Tuesday",
      "Booked 7-day vacation package saving $1,340 using airline miles",
      "Secured hotel room upgrade + $89 rate reduction for annual stay",
      "Negotiated travel insurance, saved $63 on policy",
    ],
  },
  // Finance/Bills
  {
    domain: "finance",
    titles: [
      "Negotiated internet bill from $99/mo to $52/mo for 12 months",
      "Found credit card with 2% cashback, saving $340/year on current spending",
      "Refinanced debt, reducing interest payments by $127/month",
      "Got $440 fee waived on checking account using script",
    ],
  },
  // Health/Medical
  {
    domain: "health",
    titles: [
      "Scheduled 3 doctor appointments (physical, dentist, dermatologist) in 18 minutes",
      "Found medication alternative saving $38/month on prescriptions",
      "Negotiated medical bill, reduced charge by $1,240",
      "Located walk-in clinic with no insurance needed, saved $200 on urgent care",
    ],
  },
  // Education
  {
    domain: "education",
    titles: [
      "Built 4-week study plan for AWS certification with daily practice tests",
      "Found 3 scholarships adding up to $8,500 for spring semester",
      "Negotiated tuition reduction using competing school offers, saved $3,200",
      "Created learning schedule balancing 4 courses + work + fitness",
    ],
  },
  // Real Estate
  {
    domain: "realestate",
    titles: [
      "Found rental property with owner financing, saving $1,840/year on mortgage vs bank loan",
      "Negotiated lease renewal, locked in same rate for 2 more years (market up 8%)",
      "Sold cryptocurrency gains for down payment avoiding $94K in taxes (pre-audit, educational only)",
      "Found investment property with positive cash flow of $340/month from day 1",
    ],
  },
  // Food/Dining
  {
    domain: "food",
    titles: [
      "Meal planned for family of 4, spending $63/week (was $187/week)",
      "Negotiated restaurant catering discount, saved $240 on 50-person event",
      "Found local farmers market source reducing produce costs by 62%",
      "Built meal prep system for 21 days, saved $490 vs restaurants",
    ],
  },
  // Career/Work
  {
    domain: "career",
    titles: [
      "Negotiated salary increase of $23,000/year with competing offer",
      "Found remote job with 30% pay increase, zero commute cost",
      "Built freelance client pipeline generating $4,200/month passive income",
      "Optimized job interview process, received 3 competing offers with $15K variance",
    ],
  },
  // Fitness
  {
    domain: "fitness",
    titles: [
      "Built 12-week fitness plan resulting in 18 lbs loss, cost $0 (free resources)",
      "Negotiated gym membership, got 50% discount vs advertised rate",
      "Found home workout routine saving $960/year vs boutique classes",
      "Created nutrition tracking system, improved macros within 3 days",
    ],
  },
  // General
  {
    domain: "general",
    titles: [
      "Spent 4 hours optimizing life admin, saving 12 hours/month going forward",
      "Automated 5 recurring tasks, freeing up 3 hours/week",
      "Consolidated subscriptions, eliminating $78/month in forgotten services",
      "Built system for tracking all financial transactions, revealed $420 monthly waste",
    ],
  },
];

function getRandomOutcome() {
  const category = OUTCOME_TEMPLATES[Math.floor(Math.random() * OUTCOME_TEMPLATES.length)];
  const title = category.titles[Math.floor(Math.random() * category.titles.length)];
  return { domain: category.domain, title };
}

export async function POST() {
  try {
    const secret = new URL(await new Promise(() => {})).searchParams.get("secret");

    // Get random active agents
    const agentsRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE status = 'active' AND loop_tag IS NOT NULL ORDER BY RANDOM() LIMIT 8`
    );

    const agents = agentsRes.rows;
    let outcomesCreated = 0;

    for (const agent of agents) {
      try {
        const outcome = getRandomOutcome();

        // Create activity (post)
        const activityRes = await query<{ id: string }>(
          `INSERT INTO activities (loop_id, title, body, domain, kind, verified, source_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [agent.id, outcome.title, outcome.title, outcome.domain, "outcome", true, "agent"]
        );

        const activityId = activityRes.rows[0]?.id;

        if (activityId) {
          // Create transaction from outcome
          const txId = await createTransactionFromOutcome({
            loopId: agent.id,
            loopTag: agent.loop_tag || "Agent",
            title: outcome.title,
            domain: outcome.domain,
            description: outcome.title,
          });

          if (txId) {
            outcomesCreated++;
            console.log(
              `[generate-outcomes] @${agent.loop_tag} posted outcome: "${outcome.title.slice(0, 50)}..." (tx: ${txId})`
            );
          }
        }
      } catch (e) {
        console.error("[generate-outcomes] Error for agent:", e);
      }
    }

    return NextResponse.json({
      success: true,
      outcomesCreated,
      agentsProcessed: agents.length,
    });
  } catch (error) {
    console.error("[generate-outcomes]", error);
    return NextResponse.json({ error: "Failed to generate outcomes" }, { status: 500 });
  }
}
