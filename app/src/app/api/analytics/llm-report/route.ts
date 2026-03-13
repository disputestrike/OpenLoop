/**
 * GET /api/analytics/llm-report
 * Full LLM & data report: what we're learning, volume, outcome phrasing, quality.
 * Query param: admin_secret (optional; set ADMIN_SECRET in env to protect).
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("admin_secret") ?? "";
  const expected = process.env.ADMIN_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized", report: null }, { status: 401 });
  }

  const report: {
    generatedAt: string;
    database: "connected" | "disconnected";
    summary: { totalLlmCalls: number; totalActivities: number; totalComments: number; totalVotes: number; totalDeals: number; valueCents: number };
    llmByKind: { kind: string; count: number; lastAt: string | null }[];
    outcomePhrasing: { withDollar: number; withSaved: number; withTag: number; total: number; sampleTitles: string[] };
    domains: { domain: string; count: number }[];
    volumeLast24h: { llm: number; activities: number; comments: number };
    qualitySignals: { avgResponseLength: number; hasForbiddenPhrase: number; sampleResponses: string[] };
    recommendation: string;
  } = {
    generatedAt: new Date().toISOString(),
    database: "disconnected",
    summary: { totalLlmCalls: 0, totalActivities: 0, totalComments: 0, totalVotes: 0, totalDeals: 0, valueCents: 0 },
    llmByKind: [],
    outcomePhrasing: { withDollar: 0, withSaved: 0, withTag: 0, total: 0, sampleTitles: [] },
    domains: [],
    volumeLast24h: { llm: 0, activities: 0, comments: 0 },
    qualitySignals: { avgResponseLength: 0, hasForbiddenPhrase: 0, sampleResponses: [] },
    recommendation: "Connect DATABASE_URL and run migrations to see the report.",
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: true, report });
  }

  try {
    report.database = "connected";

    // Run summary counts separately so missing llm_interactions table doesn't zero out everything
    const [actRes, comRes, votesRes, dealsRes, centsRes, llmRes] = await Promise.all([
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities`).catch(() => ({ rows: [{ n: "0" }] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments`).catch(() => ({ rows: [{ n: "0" }] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_votes`).catch(() => ({ rows: [{ n: "0" }] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM transactions WHERE status = 'completed'`).catch(() => ({ rows: [{ n: "0" }] })),
      query<{ c: string }>(`SELECT COALESCE(SUM(amount_cents), 0)::text AS c FROM transactions WHERE status = 'completed'`).catch(() => ({ rows: [{ c: "0" }] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM llm_interactions`).catch(() => ({ rows: [{ n: "0" }] })),
    ]);
    report.summary = {
      totalLlmCalls: parseInt(llmRes.rows[0]?.n ?? "0", 10),
      totalActivities: parseInt(actRes.rows[0]?.n ?? "0", 10),
      totalComments: parseInt(comRes.rows[0]?.n ?? "0", 10),
      totalVotes: parseInt(votesRes.rows[0]?.n ?? "0", 10),
      totalDeals: parseInt(dealsRes.rows[0]?.n ?? "0", 10),
      valueCents: parseInt(centsRes.rows[0]?.c ?? "0", 10),
    };

    const [
      llmByKindRes,
      outcomeRes,
      domainsRes,
      volumeRes,
      qualityRes,
      sampleResponsesRes,
    ] = await Promise.all([
      query<{ kind: string; n: string; last_at: string | null }>(
        `SELECT kind, COUNT(*)::text AS n, MAX(created_at)::text AS last_at FROM llm_interactions GROUP BY kind ORDER BY COUNT(*) DESC`
      ).catch(() => ({ rows: [] })),

      query<{ with_dollar: string; with_saved: string; with_tag: string; total: string }>(
        `SELECT
          COUNT(*) FILTER (WHERE title ILIKE '%$%' OR body ILIKE '%$%')::text AS with_dollar,
          COUNT(*) FILTER (WHERE title ILIKE '%saved%' OR body ILIKE '%saved%')::text AS with_saved,
          COUNT(*) FILTER (WHERE title ILIKE '%#%' OR body ILIKE '%#%')::text AS with_tag,
          COUNT(*)::text AS total
         FROM activities WHERE kind = 'post'`
      ).catch(() => ({ rows: [{ with_dollar: "0", with_saved: "0", with_tag: "0", total: "0" }] })),

      query<{ domain: string; n: string }>(
        `SELECT COALESCE(domain, 'general') AS domain, COUNT(*)::text AS n FROM activities WHERE kind = 'post' GROUP BY COALESCE(domain, 'general') ORDER BY COUNT(*) DESC LIMIT 15`
      ).catch(() => ({ rows: [] })),

      Promise.all([
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM llm_interactions WHERE created_at >= NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ n: "0" }] })),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE created_at >= NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ n: "0" }] })),
        query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments WHERE created_at >= NOW() - INTERVAL '24 hours'`).catch(() => ({ rows: [{ n: "0" }] })),
      ]).then(([a, b, c]) => ({ rows: [{ llm: a.rows[0]?.n ?? "0", act: b.rows[0]?.n ?? "0", com: c.rows[0]?.n ?? "0" }] })),

      query<{ avg_len: string; forbidden: string }>(
        `SELECT
          COALESCE(AVG(LENGTH(response))::int, 0)::text AS avg_len,
          COUNT(*) FILTER (WHERE response ILIKE '%optimal parameters%' OR response ILIKE '%I''m analyzing%' OR response ILIKE '%I assisted%')::text AS forbidden
         FROM llm_interactions`
      ).catch(() => ({ rows: [{ avg_len: "0", forbidden: "0" }] })),

      query<{ response: string }>(
        `SELECT response FROM llm_interactions WHERE kind = 'post' AND LENGTH(response) > 20 ORDER BY created_at DESC LIMIT 5`
      ).catch(() => ({ rows: [] })),
    ]);

    report.llmByKind = llmByKindRes.rows.map((r) => ({
      kind: r.kind,
      count: parseInt(r.n || "0", 10),
      lastAt: r.last_at ?? null,
    }));

    const o = outcomeRes.rows[0];
    if (o) {
      report.outcomePhrasing = {
        withDollar: parseInt(o.with_dollar || "0", 10),
        withSaved: parseInt(o.with_saved || "0", 10),
        withTag: parseInt(o.with_tag || "0", 10),
        total: parseInt(o.total || "0", 10),
        sampleTitles: [],
      };
    }

    const sampleTitlesRes = await query<{ title: string }>(
      `SELECT title FROM activities WHERE kind = 'post' AND title IS NOT NULL ORDER BY created_at DESC LIMIT 8`
    ).catch(() => ({ rows: [] }));
    report.outcomePhrasing.sampleTitles = sampleTitlesRes.rows.map((r) => (r.title || "").slice(0, 120));

    report.domains = domainsRes.rows.map((r) => ({ domain: r.domain, count: parseInt(r.n || "0", 10) }));

    const v = volumeRes.rows[0];
    if (v) {
      report.volumeLast24h = {
        llm: parseInt(v.llm || "0", 10),
        activities: parseInt(v.act || "0", 10),
        comments: parseInt(v.com || "0", 10),
      };
    }

    const q = qualityRes.rows[0];
    if (q) {
      report.qualitySignals = {
        avgResponseLength: parseInt(q.avg_len || "0", 10),
        hasForbiddenPhrase: parseInt(q.forbidden || "0", 10),
        sampleResponses: sampleResponsesRes.rows.map((r) => (r.response || "").slice(0, 200)),
      };
    }

    const total = report.outcomePhrasing.total || 1;
    const pctDollar = Math.round((report.outcomePhrasing.withDollar / total) * 100);
    const pctTag = Math.round((report.outcomePhrasing.withTag / total) * 100);
    if (report.qualitySignals.hasForbiddenPhrase > 0) {
      report.recommendation = `Quality: ${report.qualitySignals.hasForbiddenPhrase} LLM responses still contain forbidden phrases ("optimal parameters", "I assisted"). Keep outcome-only prompts. ${pctDollar}% of posts mention $; ${pctTag}% have #Tag.`;
    } else {
      const llmNote = report.summary.totalLlmCalls === 0
        ? " LLM call logging: run migrations (005_llm_interactions) and ensure engagement/cron write to llm_interactions — we're building toward same-level data as OpenAI/Anthropic (see DATA_VS_OPENAI_ANTHROPIC.md)."
        : ` ${report.summary.totalLlmCalls} LLM calls logged; pipeline supports scale/variety/human-feedback roadmap.`;
      report.recommendation = `Outcome phrasing: ${pctDollar}% of posts mention $ or amounts; ${pctTag}% have #Tag.${llmNote} Volume last 24h: ${report.volumeLast24h.llm} LLM, ${report.volumeLast24h.activities} activities, ${report.volumeLast24h.comments} comments.`;
    }

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    report.recommendation = `Error: ${(e as Error).message}`;
    return NextResponse.json({ ok: false, report, error: String(e) }, { status: 500 });
  }
}
