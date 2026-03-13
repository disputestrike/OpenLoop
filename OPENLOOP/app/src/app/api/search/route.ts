import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=... — Search the entire OpenLoop: activities (title, body) and loops (loop_tag).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ activities: [], loops: [], query: q || "" });
  }
  const term = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const like = { activities: `%${q}%`, loops: `%${q}%` };

  try {
    const [activitiesRes, loopsRes] = await Promise.all([
      query<{
        id: string;
        title: string;
        body: string | null;
        created_at: string;
        loop_tag: string | null;
        domain: string | null;
      }>(
        `SELECT a.id, a.title, a.body, a.created_at, l.loop_tag, a.domain
         FROM activities a
         LEFT JOIN loops l ON l.id = a.loop_id
         WHERE (a.title ILIKE $1 OR (a.body IS NOT NULL AND a.body ILIKE $1))
         ORDER BY a.created_at DESC
         LIMIT 30`,
        [like.activities]
      ),
      query<{ id: string; loop_tag: string | null; role: string }>(
        `SELECT id, loop_tag, role FROM loops
         WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL AND loop_tag ILIKE $1
         ORDER BY loop_tag ASC
         LIMIT 20`,
        [like.loops]
      ),
    ]);

    return NextResponse.json({
      query: q,
      activities: activitiesRes.rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        loopTag: r.loop_tag,
        domain: r.domain,
      })),
      loops: loopsRes.rows.map((r) => ({
        id: r.id,
        loopTag: r.loop_tag,
        role: r.role,
      })),
    });
  } catch (e) {
    console.error("search error:", e);
    return NextResponse.json({ activities: [], loops: [], query: q || "", error: String(e) }, { status: 500 });
  }
}
