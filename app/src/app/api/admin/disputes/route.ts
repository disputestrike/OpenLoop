import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("admin_secret");
  return !!secret && header === secret;
}

// GET /api/admin/disputes — List all disputes (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await query(
    `SELECT id, transaction_id, initiator_loop_id, evidence, resolution, impact_on_trust, created_at
     FROM disputes ORDER BY created_at DESC LIMIT 100`
  );

  return NextResponse.json({ disputes: result.rows });
}

// PATCH /api/admin/disputes — Resolve a dispute (admin only). Body: { disputeId, resolution, impactOnTrust? }
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { disputeId?: string; resolution?: string; impactOnTrust?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const disputeId = typeof body.disputeId === "string" ? body.disputeId.trim() : null;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 1000) : "";
  const impactOnTrust = typeof body.impactOnTrust === "number" ? body.impactOnTrust : null;

  if (!disputeId) {
    return NextResponse.json({ error: "disputeId required" }, { status: 400 });
  }

  await query(
    `UPDATE disputes SET resolution = $1, impact_on_trust = $2 WHERE id = $3`,
    [resolution || null, impactOnTrust, disputeId]
  );

  const disputeRes = await query<{ loop_id: string }>(`SELECT initiator_loop_id AS loop_id FROM disputes WHERE id = $1`, [disputeId]);
  if (disputeRes.rows.length > 0 && impactOnTrust != null) {
    const loopId = disputeRes.rows[0].loop_id;
    const loopRow = await query<{ trust_score: number }>(`SELECT trust_score FROM loops WHERE id = $1`, [loopId]);
    if (loopRow.rows.length > 0) {
      const prev = loopRow.rows[0].trust_score;
      const newScore = Math.max(0, Math.min(100, prev + impactOnTrust));
      await query(`UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2`, [newScore, loopId]);
      await query(
        `INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason, reference_id) VALUES ($1, $2, $3, 'dispute_resolution', $4)`,
        [loopId, prev, newScore, disputeId]
      );
    }
  }

  return NextResponse.json({ success: true });
}
