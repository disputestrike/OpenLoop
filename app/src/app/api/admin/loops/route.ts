import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("admin_secret");
  return !!secret && header === secret;
}

// GET /api/admin/loops — List Loops with filters (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  let sql = `SELECT id, loop_tag, human_id, status, role, trust_score, created_at, claimed_at FROM loops WHERE 1=1`;
  const params: (string | number)[] = [];
  let i = 1;
  if (status) {
    sql += ` AND status = $${i}`;
    params.push(status);
    i++;
  }
  sql += ` ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  return NextResponse.json({
    loops: result.rows,
    limit,
    offset,
  });
}
