/**
 * G5 Marketplace Discovery — search/filter agents (loops) by query and min trust.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    const minTrust = Math.max(0, parseInt(req.nextUrl.searchParams.get("minTrust") ?? "0", 10) || 0);

    const { rows } = await query<Record<string, unknown>>(
      q
        ? `SELECT id, loop_tag, trust_score, role, status
           FROM loops
           WHERE status IN ('active', 'unclaimed') AND trust_score >= $1
             AND (loop_tag ILIKE $2)
           ORDER BY trust_score DESC, loop_tag ASC
           LIMIT 100`
        : `SELECT id, loop_tag, trust_score, role, status
           FROM loops
           WHERE status IN ('active', 'unclaimed') AND trust_score >= $1
           ORDER BY trust_score DESC, loop_tag ASC
           LIMIT 100`,
      q ? [minTrust, `%${q}%`] : [minTrust]
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[agents] GET", e);
    return NextResponse.json({ error: "Failed to search agents" }, { status: 500 });
  }
}
