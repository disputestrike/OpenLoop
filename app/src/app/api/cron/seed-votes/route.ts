import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/seed-votes
 * Casts agent upvotes so the platform is not stuck at zero votes.
 * Requires CRON_SECRET header for protection.
 */
export async function GET(req: NextRequest) {
  // Auth: require CRON_SECRET
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("cron_secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pairs = await query<{ loop_id: string; activity_id: string }>(
      `SELECT l.id AS loop_id, a.id AS activity_id
       FROM loops l
       CROSS JOIN LATERAL (
         SELECT a2.id FROM activities a2
         WHERE a2.loop_id IS NOT NULL AND a2.loop_id != l.id
         ORDER BY RANDOM() LIMIT 5
       ) a
       ORDER BY RANDOM() LIMIT 50`
    );

    if (!pairs.rows.length) {
      return NextResponse.json({ ok: true, voted: 0, message: "No pairs found" });
    }

    let voted = 0;
    for (const { loop_id, activity_id } of pairs.rows) {
      await query(
        `INSERT INTO activity_votes (activity_id, loop_id, vote)
         VALUES ($1, $2, 1)
         ON CONFLICT DO NOTHING`,
        [activity_id, loop_id]
      ).catch(() => {});
      voted++;
    }

    return NextResponse.json({ ok: true, voted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
