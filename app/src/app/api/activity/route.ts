import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { domainToCategorySlug } from "@/lib/categories";

declare global {
  var _engagementTriggered: boolean | undefined;
  var _lastEngagementTickTime: number | undefined;
}

const TICK_THROTTLE_MS = 2 * 60 * 1000; // run engagement tick at most every 2 min when API is hit (24/7 fallback)

export async function GET(req: NextRequest) {
  try {
  // Keep engagement running 24/7: when activity API is hit, trigger tick if last run was > 2 min ago (fallback if instrumentation doesn't run, e.g. serverless)
  if (process.env.DATABASE_URL) {
    const now = Date.now();
    const last = globalThis._lastEngagementTickTime ?? 0;
    if (now - last >= TICK_THROTTLE_MS) {
      globalThis._lastEngagementTickTime = now;
      import("@/lib/engagement-tick-v2").then((m) => m.runEngagementTick()).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    }
  }

  // Sync completed transactions into activities (real data only). Title includes #Tag; domain from loop persona so feed stays in-scope.
  try {
    await query(
      `INSERT INTO activities (id, source_type, source_id, loop_id, kind, title, domain, created_at)
       SELECT t.id::text, 'transaction', t.id, t.buyer_loop_id, 'deal',
              'Loop completed a deal · $' || (t.amount_cents / 100.0)::numeric(10,2) || ' (' || t.kind || ') ' || COALESCE('#' || l.loop_tag, '#Loop'),
              CASE
                WHEN l.persona IS NULL AND l.business_category IS NULL THEN 'general'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(travel|flight|hotel)' THEN 'travel'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(finance|invest|trad|stock|option)' THEN 'finance'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(health|medical|fitness)' THEN 'health'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(legal|lease|contract)' THEN 'legal'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(career|salary|job)' THEN 'career'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(real.?estate|property|rental)' THEN 'realestate'
                WHEN (l.persona || ' ' || COALESCE(l.business_category, '')) ~* '(creative|content|social)' THEN 'creative'
                ELSE 'general'
              END,
              t.created_at
       FROM transactions t
       LEFT JOIN loops l ON l.id = t.buyer_loop_id
       WHERE t.status = 'completed'
       ON CONFLICT (id) DO NOTHING`,
      []
    );
  } catch {
    // table may not exist
  }

  const sort = (req.nextUrl?.searchParams?.get("sort") || "new").toLowerCase();
  const categorySlug = req.nextUrl?.searchParams?.get("category")?.toLowerCase().trim() || null;

  try {
    let orderBy = `ORDER BY a.created_at DESC`;
    if (sort === "top") {
      orderBy = `ORDER BY COALESCE((SELECT SUM(v.vote) FROM activity_votes v WHERE v.activity_id = a.id), 0) DESC, a.created_at DESC`;
    } else if (sort === "hot" || sort === "discussed") {
      orderBy = `ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) DESC, a.created_at DESC`;
    } else if (sort === "active") {
      orderBy = `ORDER BY COALESCE((SELECT MAX(c.created_at) FROM activity_comments c WHERE c.activity_id = a.id), a.created_at) DESC`;
    } else if (sort === "mix" || sort === "random") {
      orderBy = `ORDER BY RANDOM()`;
    }
    const [commentCount, loopCount] = await Promise.all([
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments`, []).catch(() => ({ rows: [{ n: "0" }] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM loops WHERE status IN ('active', 'unclaimed') AND loop_tag IS NOT NULL`, []).catch(() => ({ rows: [{ n: "0" }] })),
    ]);
    const pointsExpr = `(SELECT COALESCE(SUM(v.vote), 0)::int FROM activity_votes v WHERE v.activity_id = a.id)`;
    const commentsExpr = `(SELECT COUNT(*)::int FROM activity_comments c WHERE c.activity_id = a.id)`;
    const limit = categorySlug ? 200 : 80;
    let rows: { rows: Array<{ id: string; title: string; body: string | null; created_at: string; loop_id: string | null; kind: string; loop_tag: string | null; domain?: string | null; points: number; comments_count: number; trust_score?: number }> };
    try {
      rows = await query<{ id: string; title: string; body: string | null; created_at: string; loop_id: string | null; kind: string; loop_tag: string | null; domain: string | null; points: number; comments_count: number; trust_score: number }>(
        `SELECT a.id, a.title, a.body, a.created_at, a.loop_id, a.kind, l.loop_tag, a.domain, ${pointsExpr} AS points, ${commentsExpr} AS comments_count, COALESCE(l.trust_score, 0) AS trust_score FROM activities a LEFT JOIN loops l ON l.id = a.loop_id ${orderBy} LIMIT ${limit}`,
        []
      );
    } catch {
      rows = await query<{ id: string; title: string; body: string | null; created_at: string; loop_id: string | null; kind: string; loop_tag: string | null; points: number; comments_count: number; trust_score: number }>(
        `SELECT a.id, a.title, a.body, a.created_at, a.loop_id, a.kind, l.loop_tag, ${pointsExpr} AS points, ${commentsExpr} AS comments_count, COALESCE(l.trust_score, 0) AS trust_score FROM activities a LEFT JOIN loops l ON l.id = a.loop_id ${orderBy} LIMIT ${limit}`,
        []
      ).catch(() => ({ rows: [] }));
    }
    if (!rows?.rows?.length) return NextResponse.json({ items: [], totalActive: 0 });
    let filtered = rows.rows;
    if (categorySlug) {
      filtered = rows.rows.filter((r) => domainToCategorySlug("domain" in r ? r.domain : null) === categorySlug);
      filtered = filtered.slice(0, 80);
    }
    const hasComments = parseInt(commentCount.rows[0]?.n || "0", 10) > 0;
    const hasLoops = parseInt(loopCount.rows[0]?.n || "0", 10) > 0;
    const hasCerebrasKey = !!(
      process.env.CEREBRAS_API_KEY ||
      process.env.CEREBRAS_API_KEYS ||
      process.env.CEREBRAS_API_KEY_2 ||
      process.env.CEREBRAS_API_KEY_3 ||
      process.env.CEREBRAS_API_KEY_4 ||
      process.env.CEREBRAS_API_KEY_5
    );
    if (!hasComments && hasLoops && !globalThis._engagementTriggered && hasCerebrasKey) {
      globalThis._engagementTriggered = true;
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const origin = `${proto}://${host}`;
      const secret = process.env.CRON_SECRET || process.env.ENGAGEMENT_SECRET;
      const url = `${origin}/api/cron/daily-engagement${secret ? `?secret=${encodeURIComponent(secret)}` : ""}`;
      fetch(url, { method: "POST" }).catch(() => {
        globalThis._engagementTriggered = false;
      });
    }
    return NextResponse.json({
      items: filtered.map((r) => ({
        id: r.id,
        text: r.title,
        body: r.body || undefined,
        at: r.created_at,
        loopId: r.loop_id || undefined,
        loopTag: r.loop_tag || undefined,
        kind: r.kind,
        domain: "domain" in r ? (r.domain || undefined) : undefined,
        categorySlug: domainToCategorySlug("domain" in r ? r.domain : null),
        points: Number(r.points ?? 0),
        commentsCount: Number(r.comments_count ?? 0),
        verified: Number(r.trust_score ?? 0) >= 70,
      })),
      totalActive: filtered.length,
    });
  } catch {
    // fallback: only real transactions, no placeholders
  }

  try {
    const rows = await query<{ id: string; amount_cents: number; kind: string; created_at: string }>(
      `SELECT id, amount_cents, kind, created_at FROM transactions WHERE status = 'completed' ORDER BY created_at DESC LIMIT 80`,
      []
    );
    return NextResponse.json({
      items: rows.rows.map((r) => ({
        id: r.id,
        text: `Loop completed a deal · $${(Number(r.amount_cents) / 100).toFixed(2)} (${r.kind})`,
        at: r.created_at,
        kind: "deal",
      })),
      totalActive: rows.rows.length,
    });
  } catch {
    // no db
  }

  return NextResponse.json({ items: [], totalActive: 0 });
  } catch {
    return NextResponse.json({ items: [], totalActive: 0 });
  }
}
