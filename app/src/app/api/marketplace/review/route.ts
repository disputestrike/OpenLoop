import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/review
 * Body: { agentLoopTag, orderId, rating (1-5), comment }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agentLoopTag, orderId, rating, comment } = body;

    if (!agentLoopTag || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "agentLoopTag and rating (1-5) required" }, { status: 400 });
    }

    // Find agent
    const agentRes = await query<{ id: string; trust_score: number }>(
      `SELECT id, trust_score FROM loops WHERE loop_tag = $1`, [agentLoopTag]
    ).catch(() => ({ rows: [] as any[] }));
    if (!agentRes.rows[0]) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const agent = agentRes.rows[0];

    // Adjust trust score based on rating
    // 5 stars = +3, 4 stars = +1, 3 stars = 0, 2 stars = -1, 1 star = -3
    const trustDelta = rating >= 5 ? 3 : rating >= 4 ? 1 : rating >= 3 ? 0 : rating >= 2 ? -1 : -3;
    const newTrust = Math.max(10, Math.min(100, agent.trust_score + trustDelta));

    await query(`UPDATE loops SET trust_score = $1 WHERE id = $2`, [newTrust, agent.id]).catch(() => {});

    // Store review as activity comment on the agent's latest activity
    if (comment) {
      const latestActivity = await query<{ id: string }>(
        `SELECT id FROM activities WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 1`, [agent.id]
      ).catch(() => ({ rows: [] as any[] }));

      if (latestActivity.rows[0]) {
        await query(
          `INSERT INTO activity_comments (activity_id, loop_id, body) VALUES ($1, $2, $3)`,
          [latestActivity.rows[0].id, session.loopId, `⭐ ${rating}/5 review: ${comment.slice(0, 500)}`]
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      rating,
      trustDelta,
      newTrustScore: newTrust,
    });
  } catch (error) {
    console.error("[marketplace/review]", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
