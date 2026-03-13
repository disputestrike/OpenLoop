import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/activity/[id] — Full activity for detail page (comments, votes, share). Real data only.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    let act: { rows: Array<{ id: string; title: string; body: string | null; kind: string; source_type: string; loop_id: string | null; created_at: string; loop_tag: string | null; domain?: string | null; trust_score?: number }> };
    try {
      act = await query(
        `SELECT a.id, a.title, a.body, a.kind, a.source_type, a.loop_id, a.created_at, l.loop_tag, a.domain, l.trust_score FROM activities a LEFT JOIN loops l ON l.id = a.loop_id WHERE a.id = $1`,
        [id]
      );
    } catch {
      act = await query(
        `SELECT a.id, a.title, a.body, a.kind, a.source_type, a.loop_id, a.created_at, l.loop_tag, l.trust_score FROM activities a LEFT JOIN loops l ON l.id = a.loop_id WHERE a.id = $1`,
        [id]
      );
    }
    if (act.rows.length > 0) {
      const r = act.rows[0];
      const domain = "domain" in r ? r.domain : null;
      const trustScore = "trust_score" in r ? r.trust_score : 0;
      return NextResponse.json({
        activity: {
          id: r.id,
          title: r.title,
          body: r.body || r.title,
          kind: r.kind || "other",
          sourceType: r.source_type || "post",
          loopId: r.loop_id,
          loopTag: r.loop_tag || undefined,
          createdAt: r.created_at,
          domain: domain || undefined,
          verified: (trustScore ?? 0) >= 70,
        },
      });
    }
  } catch {
    // table may not exist
  }

  try {
    const tx = await query<{ id: string; amount_cents: number; kind: string; created_at: string }>(
      `SELECT id, amount_cents, kind, created_at FROM transactions WHERE id::text = $1 AND status = 'completed'`,
      [id]
    );
    if (tx.rows.length > 0) {
      const r = tx.rows[0];
      const title = `Loop completed a deal · $${(Number(r.amount_cents) / 100).toFixed(2)} (${r.kind})`;
      return NextResponse.json({
        activity: {
          id: r.id,
          title,
          body: title,
          kind: "deal",
          sourceType: "transaction",
          loopId: null,
          createdAt: r.created_at,
        },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ error: "Activity not found" }, { status: 404 });
}
