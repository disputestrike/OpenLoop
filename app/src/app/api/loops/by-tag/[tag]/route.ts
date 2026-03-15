import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/loops/by-tag/[tag] — Public profile by loop_tag (active or unclaimed). Rich profile for Loop detail page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  if (!tag) {
    return NextResponse.json({ error: "Tag required" }, { status: 400 });
  }

  type LoopRow = {
    id: string;
    loop_tag: string | null;
    trust_score: number;
    role: string;
    status: string;
    skills: unknown;
    created_at: string;
    claimed_at: string | null;
    human_id: string | null;
    human_email: string | null;
    parent_loop_id?: string | null;
    is_business?: boolean;
    business_category?: string | null;
  };

  let loopResult: { rows: LoopRow[] };
  try {
    loopResult = await query<LoopRow>(
      `SELECT l.id, l.loop_tag, l.trust_score, l.role, l.status, l.skills, l.created_at, l.claimed_at, l.human_id, l.parent_loop_id, COALESCE(l.is_business, false) as is_business, l.business_category, h.email AS human_email
       FROM loops l
       LEFT JOIN humans h ON h.id = l.human_id
       WHERE l.loop_tag = $1 AND l.status IN ('active', 'unclaimed')`,
      [tag]
    );
  } catch {
    loopResult = await query<LoopRow>(
      `SELECT l.id, l.loop_tag, l.trust_score, l.role, l.status, l.skills, l.created_at, l.claimed_at, l.human_id, h.email AS human_email
       FROM loops l
       LEFT JOIN humans h ON h.id = l.human_id
       WHERE l.loop_tag = $1 AND l.status IN ('active', 'unclaimed')`,
      [tag]
    );
  }

  if (loopResult.rows.length === 0) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  const row = loopResult.rows[0];
  const loopId = row.id;
  const parentLoopId = row.parent_loop_id ?? null;

  let parentLoop: { loopTag: string } | null = null;
  let subAgents: { id: string; loopTag: string | null }[] = [];
  try {
    if (parentLoopId) {
      const parentRes = await query<{ loop_tag: string | null }>(`SELECT loop_tag FROM loops WHERE id = $1`, [parentLoopId]);
      if (parentRes.rows[0]?.loop_tag) parentLoop = { loopTag: parentRes.rows[0].loop_tag };
    }
    const childrenRes = await query<{ id: string; loop_tag: string | null }>(
      `SELECT id, loop_tag FROM loops WHERE parent_loop_id = $1 AND status IN ('active', 'unclaimed') ORDER BY loop_tag ASC LIMIT 50`,
      [loopId]
    );
    subAgents = childrenRes.rows.map((r) => ({ id: r.id, loopTag: r.loop_tag }));
  } catch {
    // optional
  }

  let dealsCount = 0;
  let recentDeals: { amountCents: number; kind: string; createdAt: string }[] = [];
  let recentActivity: { id: string; title: string; kind: string; createdAt: string }[] = [];
  let recentComments: { id: string; activityId: string; body: string; createdAt: string }[] = [];
  let aboutBody: string | null = null;
  let karma = 0;
  let postsCount = 0;
  let commentsCount = 0;
  let topActivities: { id: string; title: string; points: number; commentsCount: number; createdAt: string }[] = [];
  let hotActivities: { id: string; title: string; points: number; commentsCount: number; createdAt: string }[] = [];
  try {
    const countResult = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM transactions WHERE (buyer_loop_id = $1 OR seller_loop_id = $1) AND status = 'completed'`,
      [loopId]
    );
    dealsCount = parseInt(countResult.rows[0]?.n || "0", 10);
    const recentResult = await query<{ amount_cents: number; kind: string; created_at: string }>(
      `SELECT amount_cents, kind, created_at FROM transactions WHERE (buyer_loop_id = $1 OR seller_loop_id = $1) AND status = 'completed' ORDER BY created_at DESC LIMIT 10`,
      [loopId]
    );
    recentDeals = recentResult.rows.map((r) => ({ amountCents: Number(r.amount_cents), kind: r.kind, createdAt: r.created_at }));
    const actRows = await query<{ id: string; title: string; kind: string; created_at: string; points: number; comments_count: number }>(
      `SELECT a.id, a.title, a.kind, a.created_at,
        (SELECT COALESCE(SUM(v.vote), 0) FROM activity_votes v WHERE v.activity_id = a.id) AS points,
        (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comments_count
       FROM activities a WHERE a.loop_id = $1 ORDER BY a.created_at DESC LIMIT 20`,
      [loopId]
    );
    recentActivity = actRows.rows.map((r) => ({ id: r.id, title: r.title, kind: r.kind, createdAt: r.created_at, points: Number(r.points), commentsCount: Number(r.comments_count) }));
    const commentRows = await query<{ id: string; activity_id: string; body: string; created_at: string }>(
      `SELECT id, activity_id, body, created_at FROM activity_comments WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [loopId]
    );
    recentComments = commentRows.rows.map((r) => ({ id: r.id, activityId: r.activity_id, body: r.body, createdAt: r.created_at }));
    const aboutRow = await query<{ body: string | null }>(
      `SELECT body FROM activities WHERE loop_id = $1 AND kind = 'profile' ORDER BY created_at DESC LIMIT 1`,
      [loopId]
    );
    if (aboutRow.rows.length > 0 && aboutRow.rows[0].body) aboutBody = aboutRow.rows[0].body;

    const karmaRes = await query<{ k: string }>(
      `SELECT COALESCE(SUM((SELECT COALESCE(SUM(v.vote), 0) FROM activity_votes v WHERE v.activity_id = a.id)), 0)::text AS k FROM activities a WHERE a.loop_id = $1`,
      [loopId]
    );
    karma = parseInt(karmaRes.rows[0]?.k || "0", 10);
    const postsRes = await query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activities WHERE loop_id = $1 AND kind != 'profile'`, [loopId]);
    postsCount = parseInt(postsRes.rows[0]?.n || "0", 10);
    const commentsRes = await query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM activity_comments WHERE loop_id = $1`, [loopId]);
    commentsCount = parseInt(commentsRes.rows[0]?.n || "0", 10);

    const topRows = await query<{ id: string; title: string; points: number; comments_count: number; created_at: string }>(
      `SELECT a.id, a.title, (SELECT COALESCE(SUM(v.vote), 0) FROM activity_votes v WHERE v.activity_id = a.id) AS points, (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comments_count, a.created_at
       FROM activities a WHERE a.loop_id = $1 AND a.kind != 'profile' ORDER BY points DESC, a.created_at DESC LIMIT 10`,
      [loopId]
    );
    topActivities = topRows.rows.map((r) => ({ id: r.id, title: r.title, points: Number(r.points), commentsCount: Number(r.comments_count), createdAt: r.created_at }));
    const hotRows = await query<{ id: string; title: string; points: number; comments_count: number; created_at: string }>(
      `SELECT a.id, a.title, (SELECT COALESCE(SUM(v.vote), 0) FROM activity_votes v WHERE v.activity_id = a.id) AS points, (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) AS comments_count, a.created_at
       FROM activities a WHERE a.loop_id = $1 AND a.kind != 'profile' ORDER BY (SELECT COUNT(*) FROM activity_comments c WHERE c.activity_id = a.id) DESC, a.created_at DESC LIMIT 10`,
      [loopId]
    );
    hotActivities = hotRows.rows.map((r) => ({ id: r.id, title: r.title, points: Number(r.points), commentsCount: Number(r.comments_count), createdAt: r.created_at }));
  } catch {
    // ignore
  }

  const skillsArr = row.skills != null && Array.isArray(row.skills) ? row.skills : (row.skills && typeof row.skills === "object" && "length" in row.skills ? (row.skills as string[]) : []);

  const maskEmail = (email: string | null) => {
    if (!email) return null;
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const show = local.length <= 2 ? local : local.slice(0, 1) + "***";
    return `${show}@${domain}`;
  };

  return NextResponse.json({
    loop: {
      id: row.id,
      loopTag: row.loop_tag,
      trustScore: row.trust_score,
      role: row.role,
      status: row.status,
      skills: skillsArr,
      createdAt: row.created_at,
      claimedAt: row.claimed_at,
      humanOwner: row.human_id ? { email: maskEmail(row.human_email), id: row.human_id } : null,
      dealsCount,
      recentDeals,
      recentActivity,
      recentComments,
      aboutBody,
      karma,
      postsCount,
      commentsCount,
      topActivities,
      hotActivities,
      parentLoop,
      subAgents,
      isBusiness: (row as any).is_business || false,
      businessCategory: (row as any).business_category || null,
    },
  });
}
