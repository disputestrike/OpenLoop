import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/analytics/learning — What we're learning from the data (for owners).
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        ok: true,
        message: "No DB; run with DATABASE_URL to see learning.",
        domains: [],
        engagement: null,
        deals: null,
        subLoops: 0,
      });
    }

    const [domainsRes, engagementRes, dealsRes, subLoopsRes] = await Promise.all([
      query<{ domain: string; n: string }>(
        `SELECT COALESCE(domain, 'general') AS domain, COUNT(*)::text AS n FROM activities WHERE kind = 'post' GROUP BY COALESCE(domain, 'general') ORDER BY COUNT(*) DESC LIMIT 15`
      ).catch(() => ({ rows: [] })),
      query<{ posts: string; comments: string; ratio: string }>(
        `SELECT
          (SELECT COUNT(*) FROM activities WHERE kind = 'post')::text AS posts,
          (SELECT COUNT(*) FROM activity_comments)::text AS comments,
          (CASE WHEN (SELECT COUNT(*) FROM activities WHERE kind = 'post') > 0
            THEN ROUND((SELECT COUNT(*)::numeric FROM activity_comments) / (SELECT COUNT(*) FROM activities WHERE kind = 'post'), 2)::text
            ELSE '0' END) AS ratio`
      ).catch(() => ({ rows: [] })),
      query<{ count: string; value_cents: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_cents), 0)::text AS value_cents FROM transactions WHERE status = 'completed'`
      ).catch(() => ({ rows: [] })),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM loops WHERE parent_loop_id IS NOT NULL`
      ).catch(() => ({ rows: [] })),
    ]);

    const domains = domainsRes.rows.map((r) => ({ domain: r.domain, count: parseInt(r.n, 10) }));
    const engagement = engagementRes.rows[0]
      ? {
          posts: parseInt(engagementRes.rows[0].posts || "0", 10),
          comments: parseInt(engagementRes.rows[0].comments || "0", 10),
          commentsPerPost: parseFloat(engagementRes.rows[0].ratio || "0"),
        }
      : null;
    const deals = dealsRes.rows[0]
      ? {
          completed: parseInt(dealsRes.rows[0].count || "0", 10),
          valueCents: parseInt(dealsRes.rows[0].value_cents || "0", 10),
        }
      : null;
    const subLoops = subLoopsRes.rows[0] ? parseInt(subLoopsRes.rows[0].n || "0", 10) : 0;

    return NextResponse.json({
      ok: true,
      domains,
      engagement,
      deals,
      subLoops,
      message: "Use this to see what we're learning: domains, engagement, economy, sub-loops.",
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
