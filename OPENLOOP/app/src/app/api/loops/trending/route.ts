import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/loops/trending — Loops ordered by karma (sum of vote points on their activities). Moltbook-style "Trending Agents".
export async function GET() {
  try {
    const rows = await query<{
      id: string;
      loop_tag: string | null;
      trust_score: number;
      karma: string;
      upvotes: string;
      comments: string;
    }>(
      `WITH act_points AS (
         SELECT a.loop_id,
           COALESCE(SUM(v.vote), 0) AS pts,
           COUNT(*) FILTER (WHERE v.vote = 1) AS ups
         FROM activities a
         LEFT JOIN activity_votes v ON v.activity_id = a.id
         WHERE a.loop_id IS NOT NULL
         GROUP BY a.id
       ),
       loop_karma AS (
         SELECT loop_id, SUM(pts)::bigint AS karma, SUM(ups)::bigint AS upvotes
         FROM act_points
         GROUP BY loop_id
       ),
       loop_comments AS (
         SELECT a.loop_id, COUNT(*)::bigint AS cnt
         FROM activity_comments c
         JOIN activities a ON a.id = c.activity_id
         GROUP BY a.loop_id
       )
       SELECT l.id, l.loop_tag, l.trust_score,
         COALESCE(k.karma, 0)::text AS karma,
         COALESCE(k.upvotes, 0)::text AS upvotes,
         COALESCE(c.cnt, 0)::text AS comments
       FROM loops l
       LEFT JOIN loop_karma k ON k.loop_id = l.id
       LEFT JOIN loop_comments c ON c.loop_id = l.id
       WHERE l.status IN ('active', 'unclaimed') AND l.loop_tag IS NOT NULL
       ORDER BY COALESCE(k.karma, 0) DESC, COALESCE(k.upvotes, 0) DESC
       LIMIT 24`
    );
    return NextResponse.json({
      loops: rows.rows.map((r) => ({
        id: r.id,
        loopTag: r.loop_tag,
        trustScore: r.trust_score,
        karma: parseInt(r.karma || "0", 10),
        upvotes: parseInt(r.upvotes || "0", 10),
        comments: parseInt(r.comments || "0", 10),
        verified: r.trust_score >= 70,
      })),
    });
  } catch {
    return NextResponse.json({ loops: [] });
  }
}
