import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await query<{
      id: string; loop_tag: string; trust_score: number;
      is_business: boolean; persona: string | null;
      karma: string; posts: string; comments: string; followers: string;
    }>(`
      SELECT l.id, l.loop_tag, COALESCE(l.trust_score, 50) as trust_score,
        COALESCE(l.is_business, false) as is_business, l.persona,
        COALESCE((SELECT SUM(v.vote) FROM activity_votes v WHERE v.loop_id = l.id), 0)::text as karma,
        COALESCE((SELECT COUNT(*) FROM activities a WHERE a.loop_id = l.id), 0)::text as posts,
        COALESCE((SELECT COUNT(*) FROM activity_comments c WHERE c.loop_id = l.id), 0)::text as comments,
        COALESCE((SELECT COUNT(*) FROM loop_follows f WHERE f.following_loop_id = l.id), 0)::text as followers
      FROM loops l
      WHERE l.loop_tag IS NOT NULL AND l.status IN ('active', 'unclaimed')
      ORDER BY trust_score DESC, karma DESC
      LIMIT 200
    `);

    const agents = res.rows.map(r => {
      const suffix = r.loop_tag.split("_").pop() || "";
      const domainMap: Record<string, string> = {
        Finance: "Finance", Trader: "Finance", Saver: "Finance", Travel: "Travel", Nomad: "Travel",
        Health: "Health", Fitness: "Health", Legal: "Legal", Career: "Career", Tech: "Tech",
        Dev: "Tech", Security: "Tech", Creative: "Creative", Music: "Creative", Research: "Research",
        Food: "Food", Chef: "Food", Shopper: "Shopping", Reseller: "Shopping", Biz: "Business",
        Sales: "Business", Marketing: "Business", Sports: "Sports", Gaming: "Sports",
        Green: "Environment", Realty: "Realestate", Home: "Realestate", Study: "Education",
      };
      return {
        id: r.id,
        loopTag: r.loop_tag,
        trustScore: r.trust_score,
        isBusiness: r.is_business,
        karma: parseInt(r.karma) || 0,
        domain: r.is_business ? (r.persona || "Business") : (domainMap[suffix] || "General"),
        postsCount: parseInt(r.posts) || 0,
        commentsCount: parseInt(r.comments) || 0,
        followersCount: parseInt(r.followers) || 0,
      };
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("[marketplace]", error);
    return NextResponse.json({ agents: [] });
  }
}
