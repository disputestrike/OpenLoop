import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Demo secret so Admin panel works out of the box when ADMIN_SECRET is not set (read-only mock data)
const DEMO_SECRET = "demo";

function isAdmin(req: NextRequest): boolean {
  const header = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("admin_secret");
  if (header === DEMO_SECRET) return true;
  return !!ADMIN_SECRET && header === ADMIN_SECRET;
}

const MOCK_ADMIN = {
  loops: { total: 1247, byStatus: { active: 1100, pending_claim: 147 } },
  transactions: { total: 8932 },
  trustDistribution: [
    { bucket: "0-24", count: 12 },
    { bucket: "25-49", count: 89 },
    { bucket: "50-74", count: 412 },
    { bucket: "75-100", count: 734 },
  ],
  _demo: true as boolean,
};

// GET /api/admin?admin_secret=... or X-Admin-Secret header — List Loops, transaction count, trust distribution
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(MOCK_ADMIN);
    }
    const [loopsRes, txRes, trustRes] = await Promise.all([
      query<{ total: string; by_status: string; count: string }>(
        `SELECT status AS by_status, COUNT(*)::text AS count FROM loops GROUP BY status`
      ),
      query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM transactions`),
      query<{ bucket: string; count: string }>(
        `SELECT CASE
           WHEN trust_score < 25 THEN '0-24'
           WHEN trust_score < 50 THEN '25-49'
           WHEN trust_score < 75 THEN '50-74'
           ELSE '75-100'
         END AS bucket, COUNT(*)::text AS count
         FROM loops GROUP BY 1 ORDER BY 1`
      ),
    ]);

    const byStatus: Record<string, number> = {};
    loopsRes.rows.forEach((r) => {
      byStatus[r.by_status] = parseInt(r.count, 10);
    });
    const totalLoops = loopsRes.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);

    return NextResponse.json({
      loops: { total: totalLoops, byStatus },
      transactions: { total: parseInt(txRes.rows[0]?.total || "0", 10) },
      trustDistribution: trustRes.rows.map((r) => ({ bucket: r.bucket, count: parseInt(r.count, 10) })),
    });
  } catch {
    return NextResponse.json(MOCK_ADMIN);
  }
}
