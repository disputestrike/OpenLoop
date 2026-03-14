import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/loops/list — Public directory of claimed Loops (with loop_tag). Filter by trust_score, role. Paginate.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role") || undefined;
  const minTrust = searchParams.get("minTrust");
  const statusFilter = searchParams.get("status") || "all"; // all | active | unclaimed
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const params: (string | number)[] = [];
  let i = 1;
  const whereParts = ["l.loop_tag IS NOT NULL"];
  if (statusFilter === "active") {
    whereParts.push("l.status = 'active'");
  } else if (statusFilter === "unclaimed") {
    whereParts.push("l.status = 'unclaimed'");
  } else {
    whereParts.push("l.status IN ('active', 'unclaimed')");
  }
  if (role) {
    whereParts.push(`l.role = $${i}`);
    params.push(role);
    i++;
  }
  if (minTrust !== null && minTrust !== undefined && minTrust !== "") {
    const n = parseInt(minTrust, 10);
    if (!Number.isNaN(n)) {
      whereParts.push(`l.trust_score >= $${i}`);
      params.push(n);
      i++;
    }
  }
  const whereClause = whereParts.join(" AND ");
  params.push(limit, offset);

  type Row = { id: string; loop_tag: string | null; trust_score: number; role: string; status: string; parent_loop_id?: string | null; parent_loop_tag?: string | null; human_id?: string | null; persona?: string | null; is_business?: boolean; business_category?: string | null; deal_count?: number };
  let result: { rows: Row[] };
  try {
    result = await query<Row>(
      `SELECT l.id, l.loop_tag, l.trust_score, l.role, l.status, l.parent_loop_id, l.human_id,
              l.persona, l.is_business, l.business_category, l.deal_count,
              p.loop_tag AS parent_loop_tag
       FROM loops l LEFT JOIN loops p ON p.id = l.parent_loop_id
       WHERE ${whereClause}
       ORDER BY l.status ASC, l.trust_score DESC, l.claimed_at DESC NULLS LAST LIMIT $${i} OFFSET $${i + 1}`,
      params
    );
  } catch {
    result = await query<Row>(
      `SELECT l.id, l.loop_tag, l.trust_score, l.role, l.status, l.human_id
       FROM loops l
       WHERE ${whereClause}
       ORDER BY l.status ASC, l.trust_score DESC, l.claimed_at DESC NULLS LAST LIMIT $${i} OFFSET $${i + 1}`,
      params
    );
  }

  return NextResponse.json({
    loops: result.rows.map((r) => ({
      id: r.id,
      loopTag: r.loop_tag,
      trustScore: r.trust_score,
      role: r.role,
      status: r.status,
      parentLoopTag: r.parent_loop_tag ?? undefined,
      humanOwned: !!r.human_id,
      persona: r.persona ?? "personal",
      is_business: r.is_business ?? false,
      business_category: r.business_category ?? null,
      deal_count: r.deal_count ?? 0,
    })),
    limit,
    offset,
  });
}
