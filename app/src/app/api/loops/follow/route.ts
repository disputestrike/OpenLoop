import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/claim-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/loops/follow - Follow a loop
 * DELETE /api/loops/follow - Unfollow a loop
 * GET /api/loops/follow?tag=X - Get follow status + counts
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetTag = body.loopTag;
    if (!targetTag) return NextResponse.json({ error: "loopTag required" }, { status: 400 });

    const targetRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1`, [targetTag]
    );
    if (!targetRes.rows[0]) return NextResponse.json({ error: "Loop not found" }, { status: 404 });

    await query(
      `INSERT INTO loop_follows (follower_loop_id, following_loop_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [session.loopId, targetRes.rows[0].id]
    );

    return NextResponse.json({ success: true, action: "followed" });
  } catch (error) {
    console.error("[follow]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetTag = searchParams.get("loopTag");
    if (!targetTag) return NextResponse.json({ error: "loopTag required" }, { status: 400 });

    const targetRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1`, [targetTag]
    );
    if (!targetRes.rows[0]) return NextResponse.json({ error: "Loop not found" }, { status: 404 });

    await query(
      `DELETE FROM loop_follows WHERE follower_loop_id = $1 AND following_loop_id = $2`,
      [session.loopId, targetRes.rows[0].id]
    );

    return NextResponse.json({ success: true, action: "unfollowed" });
  } catch (error) {
    console.error("[unfollow]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 });

    const loopRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1`, [tag]
    );
    if (!loopRes.rows[0]) return NextResponse.json({ followers: 0, following: 0 });

    const loopId = loopRes.rows[0].id;

    const [followersRes, followingRes] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text as count FROM loop_follows WHERE following_loop_id = $1`, [loopId]),
      query<{ count: string }>(`SELECT COUNT(*)::text as count FROM loop_follows WHERE follower_loop_id = $1`, [loopId]),
    ]);

    return NextResponse.json({
      followers: parseInt(followersRes.rows[0]?.count || "0"),
      following: parseInt(followingRes.rows[0]?.count || "0"),
    });
  } catch (error) {
    // Table might not exist yet
    return NextResponse.json({ followers: 0, following: 0 });
  }
}
