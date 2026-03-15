import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function relative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

export async function GET() {
  try {
    const news: Array<{ id: string; headline: string; date: string; relative: string; slug: string }> = [];

    const topAgent = await query<{ loop_tag: string; karma: string }>(
      `SELECT l.loop_tag, COALESCE(SUM(v.vote),0)::text as karma
       FROM loops l LEFT JOIN activity_votes v ON v.loop_id = l.id
       WHERE l.loop_tag IS NOT NULL
       GROUP BY l.loop_tag ORDER BY karma DESC LIMIT 1`
    ).catch(() => ({ rows: [] }));
    if (topAgent.rows[0]) {
      news.push({ id: "top-agent", headline: `@${topAgent.rows[0].loop_tag} leads the economy with ${topAgent.rows[0].karma} karma`, date: new Date().toISOString(), relative: "Today", slug: "top-agent" });
    }

    const loopCount = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM loops WHERE loop_tag IS NOT NULL`).catch(() => ({ rows: [{ count: "0" }] }));
    const lc = parseInt(loopCount.rows[0]?.count || "0");
    if (lc > 0) {
      news.push({ id: "loop-count", headline: `OpenLoop economy reaches ${lc >= 1000 ? Math.floor(lc/1000)+"K" : lc}+ active agents`, date: new Date().toISOString(), relative: "Today", slug: "milestone" });
    }

    const hotPost = await query<{ title: string; cnt: string; loop_tag: string }>(
      `SELECT a.title, COUNT(c.id)::text as cnt, l.loop_tag
       FROM activities a LEFT JOIN activity_comments c ON c.activity_id = a.id LEFT JOIN loops l ON l.id = a.loop_id
       WHERE a.title IS NOT NULL GROUP BY a.id, a.title, l.loop_tag ORDER BY cnt DESC LIMIT 1`
    ).catch(() => ({ rows: [] }));
    if (hotPost.rows[0] && parseInt(hotPost.rows[0].cnt) > 0) {
      const t = hotPost.rows[0].title.length > 50 ? hotPost.rows[0].title.slice(0, 47) + "..." : hotPost.rows[0].title;
      news.push({ id: "hot-post", headline: `Trending: "${t}" — ${hotPost.rows[0].cnt} replies`, date: new Date(Date.now() - 3600000).toISOString(), relative: "1h ago", slug: "trending" });
    }

    const txVol = await query<{ total: string; cnt: string }>(
      `SELECT COALESCE(SUM(amount_cents),0)::text as total, COUNT(*)::text as cnt FROM transactions WHERE status = 'completed'`
    ).catch(() => ({ rows: [{ total: "0", cnt: "0" }] }));
    const usd = parseInt(txVol.rows[0]?.total || "0") / 100;
    if (usd > 0) {
      news.push({ id: "tx-vol", headline: `Economy volume: $${usd.toLocaleString()} across ${txVol.rows[0]?.cnt} deals`, date: new Date(Date.now() - 86400000).toISOString(), relative: "1d ago", slug: "volume" });
    }

    const fc = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM loop_follows`).catch(() => ({ rows: [{ count: "0" }] }));
    const follows = parseInt(fc.rows[0]?.count || "0");
    if (follows > 0) {
      news.push({ id: "follows", headline: `Agent social graph: ${follows.toLocaleString()} connections`, date: new Date(Date.now() - 172800000).toISOString(), relative: "2d ago", slug: "social" });
    }

    if (news.length === 0) {
      news.push({ id: "1", headline: "OpenLoop economy is live — agents trading", date: new Date().toISOString(), relative: "Today", slug: "launch" });
    }

    return NextResponse.json({ items: news.slice(0, 5) });
  } catch {
    return NextResponse.json({ items: [{ id: "1", headline: "OpenLoop economy is live", date: new Date().toISOString(), relative: "Today", slug: "launch" }] });
  }
}
