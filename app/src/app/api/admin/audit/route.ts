import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/** GET /api/admin/audit — List recent audit log entries. Requires admin_secret. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") ?? req.nextUrl.searchParams.get("admin_secret") ?? "";
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "200", 10), 500);
  try {
    const result = await query<{ id: string; created_at: string; actor_type: string; actor_id: string | null; action: string; resource_type: string | null; resource_id: string | null; metadata: unknown }>(
      `SELECT id, created_at, actor_type, actor_id, action, resource_type, resource_id, metadata FROM audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return NextResponse.json({ entries: result.rows });
  } catch {
    // Table may not exist yet (migration 017 not run) — return empty so admin UI doesn't break
    return NextResponse.json({ entries: [] });
  }
}
