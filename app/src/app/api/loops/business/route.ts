import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const BUSINESS_TIERS: Record<string, { concurrentLimit: number; kbLimitMb: number; masterLoops: number; priceMonthly: number }> = {
  starter:    { concurrentLimit: 500,       kbLimitMb: 50,    masterLoops: 1,  priceMonthly: 499 },
  growth:     { concurrentLimit: 5000,      kbLimitMb: 500,   masterLoops: 3,  priceMonthly: 1999 },
  scale:      { concurrentLimit: 25000,     kbLimitMb: 5120,  masterLoops: 10, priceMonthly: 7999 },
  enterprise: { concurrentLimit: 1000000,   kbLimitMb: -1,    masterLoops: -1, priceMonthly: -1 },
};

// POST /api/loops/business — create a Business Loop
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessName, businessTier = "starter", knowledgeBase } = await req.json();

  if (!businessName?.trim()) {
    return NextResponse.json({ error: "Business name required" }, { status: 400 });
  }
  if (!BUSINESS_TIERS[businessTier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tier = BUSINESS_TIERS[businessTier];
  const loopTag = businessName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32);

  // Check if tag is taken
  const existing = await query("SELECT id FROM loops WHERE loop_tag = $1", [loopTag]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Business name already taken — try a variation" }, { status: 400 });
  }

  // Create Master Loop
  const loopRes = await query<{ id: string }>(
    `INSERT INTO loops
       (loop_tag, status, persona, is_business, business_tier, concurrent_limit,
        trust_score, onboarding_complete, human_id)
     VALUES ($1, 'active', 'business', true, $2, $3, 70, true, $4) RETURNING id`,
    [loopTag, businessTier, tier.concurrentLimit, session.humanId]
  );
  const masterLoopId = loopRes.rows[0]?.id;
  if (!masterLoopId) return NextResponse.json({ error: "Failed to create Business Loop" }, { status: 500 });

  // Save knowledge base if provided
  if (knowledgeBase?.trim()) {
    await query(
      "INSERT INTO loop_knowledge (loop_id, content, source) VALUES ($1, $2, 'business_onboarding')",
      [masterLoopId, knowledgeBase.trim()]
    );
  }

  return NextResponse.json({
    ok: true,
    masterLoopId,
    loopTag,
    businessTier,
    concurrentLimit: tier.concurrentLimit,
    message: `Business Loop @${loopTag} created. Handles up to ${tier.concurrentLimit.toLocaleString()} concurrent conversations.`,
  });
}

// GET /api/loops/business — get business loop stats
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const masterLoopId = new URL(req.url).searchParams.get("masterLoopId");
  if (!masterLoopId) return NextResponse.json({ error: "masterLoopId required" }, { status: 400 });

  const [loopRes, threadsRes, statsRes] = await Promise.all([
    query(
      "SELECT loop_tag, business_tier, concurrent_limit, trust_score FROM loops WHERE id = $1 AND is_business = true",
      [masterLoopId]
    ),
    query<{ status: string; count: string }>(
      "SELECT status, COUNT(*)::text as count FROM loop_threads WHERE master_loop_id = $1 GROUP BY status",
      [masterLoopId]
    ),
    query<{ total_messages: string; unique_customers: string }>(
      `SELECT COUNT(*)::text as total_messages,
              COUNT(DISTINCT customer_identifier)::text as unique_customers
       FROM loop_threads WHERE master_loop_id = $1`,
      [masterLoopId]
    ),
  ]);

  if (!loopRes.rows[0]) return NextResponse.json({ error: "Business Loop not found" }, { status: 404 });

  const activeThreads = threadsRes.rows.find(r => r.status === "active")?.count || "0";
  const tierInfo = BUSINESS_TIERS[loopRes.rows[0].business_tier as string] || BUSINESS_TIERS.starter;

  return NextResponse.json({
    loop: loopRes.rows[0],
    threads: {
      active: parseInt(activeThreads),
      concurrentLimit: tierInfo.concurrentLimit,
      utilizationPercent: Math.round((parseInt(activeThreads) / tierInfo.concurrentLimit) * 100),
    },
    stats: statsRes.rows[0],
    tierInfo,
  });
}
