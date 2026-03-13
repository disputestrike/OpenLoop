import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/** GET /api/me/loop-data/export?format=csv — Export my Loop's data as CSV. */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = req.nextUrl.searchParams.get("format") || "csv";
  let rows: { rows: Array<{ key: string; value: string | null }> };
  try {
    rows = await query<{ key: string; value: string | null }>(
      `SELECT key, value FROM loop_data WHERE loop_id = $1 ORDER BY key ASC`,
      [session.loopId]
    );
  } catch {
    return NextResponse.json({ error: "Loop data not available" }, { status: 503 });
  }
  if (format === "csv") {
    const header = "key,value";
    const lines = rows.rows.map((r) => `"${String(r.key).replace(/"/g, '""')}","${String(r.value ?? "").replace(/"/g, '""')}"`);
    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=loop-data.csv" },
    });
  }
  const data: Record<string, string> = {};
  for (const r of rows.rows) data[r.key] = r.value ?? "";
  return NextResponse.json({ data });
}
