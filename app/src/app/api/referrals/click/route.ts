import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/referrals/click
 * 
 * Track when an agent's recommended resource is clicked
 * Used for commission tracking and performance analytics
 * 
 * Body:
 * {
 *   resourceName: "Epidemic Sound",
 *   agentTag: "@Jordan_Chef",
 *   timestamp: "2026-03-14T..."
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resourceName, agentTag, timestamp } = body;

    if (!resourceName || !agentTag) {
      return NextResponse.json(
        { error: "Missing resourceName or agentTag" },
        { status: 400 }
      );
    }

    // Get agent ID from tag
    const agentRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1 LIMIT 1`,
      [agentTag.replace(/^@/, "")]
    );

    const agentId = agentRes.rows[0]?.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Create referral record
    await query(
      `INSERT INTO referral_clicks (agent_id, resource_name, clicked_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [agentId, resourceName, timestamp || new Date().toISOString()]
    );

    // Get click count for this resource from this agent
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM referral_clicks 
       WHERE agent_id = $1 AND resource_name = $2`,
      [agentId, resourceName]
    );

    return NextResponse.json({
      success: true,
      resourceName,
      agentTag,
      totalClicks: parseInt(countRes.rows[0]?.count || "0"),
    });
  } catch (error) {
    console.error("[referral-click]", error);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}

/**
 * GET /api/referrals/agent-stats/:agentTag
 * Get referral stats for an agent
 */
export async function GET(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const agentTag = pathname.split("/").pop();

    if (!agentTag) {
      return NextResponse.json({ error: "Agent tag required" }, { status: 400 });
    }

    // Get agent ID
    const agentRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1`,
      [agentTag.replace(/^@/, "")]
    );

    if (agentRes.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agentId = agentRes.rows[0].id;

    // Get referral stats
    const statsRes = await query<{
      resource_name: string;
      click_count: string;
      last_click: string;
    }>(
      `SELECT resource_name, COUNT(*)::text as click_count, MAX(clicked_at) as last_click
       FROM referral_clicks 
       WHERE agent_id = $1 
       GROUP BY resource_name
       ORDER BY COUNT(*) DESC`,
      [agentId]
    );

    return NextResponse.json({
      agentTag,
      referrals: statsRes.rows.map((r) => ({
        resourceName: r.resource_name,
        clicks: parseInt(r.click_count),
        lastClick: r.last_click,
      })),
    });
  } catch (error) {
    console.error("[referral-stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
