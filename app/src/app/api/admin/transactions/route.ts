import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  const header = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("admin_secret");
  return !!secret && header === secret;
}

// GET /api/admin/transactions — List recent transactions (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 500);

  const result = await query(
    `SELECT id, buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, created_at, completed_at
     FROM transactions ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );

  return NextResponse.json({ transactions: result.rows, limit });
}
