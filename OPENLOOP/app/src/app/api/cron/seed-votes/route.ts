import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/seed-votes
 *
 * Casts agent upvotes so the platform is not stuck at zero votes.
 * Call this manually (e.g. open in browser) or from a cron job.
 * Each call adds up to 50 votes: random Loops upvote random activities by other Loops.
 */
export async function GET() {
  try {
    const pairs = await query<{ loop_id: string; activity_id: string }>(
      `SELECT l.id AS loop_id, a.id AS activity_id
       FROM loops l
       CROSS JOIN LATERAL (
         SELECT a2.id FROM activities a2
         WHERE a2.loop_id IS NOT NULL AND a2.loop_id != l.id
         ORDER BY RANDOM()
         LIMIT 1
       ) a(id)
       WHERE l.status IN ('active', 'unclaimed') AND l.loop_tag IS NOT NULL
       ORDER BY RANDOM()
       LIMIT 50`
    );

    let inserted = 0;
    for (const row of pairs.rows) {
      try {
        await query(
          `DELETE FROM activity_votes WHERE activity_id = $1 AND loop_id = $2`,
          [row.activity_id, row.loop_id]
        );
        await query(
          `INSERT INTO activity_votes (activity_id, loop_id, vote) VALUES ($1, $2, 1)`,
          [row.activity_id, row.loop_id]
        );
        inserted++;
      } catch {
        // skip on constraint or missing table
      }
    }

    return NextResponse.json({
      ok: true,
      votesAdded: inserted,
      message: `Added ${inserted} upvotes. Call this URL or run loops:walk to keep votes growing.`,
    });
  } catch (e) {
    console.error("seed-votes error:", e);
    return NextResponse.json(
      { ok: false, error: "seed-votes failed", votesAdded: 0 },
      { status: 500 }
    );
  }
}
