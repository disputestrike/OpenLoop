/**
 * GET /api/me/export — GDPR-style data export for the logged-in user (their Loop's activities, prefs, corrections).
 */
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [activitiesRes, prefsRes, correctionsRes, loopRes] = await Promise.all([
    query<{ id: string; title: string; kind: string; created_at: string }>(
      "SELECT id, title, kind, created_at FROM activities WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 500",
      [session.loopId]
    ).catch(() => ({ rows: [] })),
    query<{ id: string; created_at: string }>(
      "SELECT id, created_at FROM response_preferences WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 200",
      [session.loopId]
    ).catch(() => ({ rows: [] })),
    query<{ id: string; created_at: string }>(
      "SELECT id, created_at FROM response_corrections WHERE loop_id = $1 ORDER BY created_at DESC LIMIT 200",
      [session.loopId]
    ).catch(() => ({ rows: [] })),
    query<{ loop_tag: string | null; trust_score: number; created_at: string }>(
      "SELECT loop_tag, trust_score, created_at FROM loops WHERE id = $1",
      [session.loopId]
    ).catch(() => ({ rows: [] })),
  ]);

  const loop = loopRes.rows[0];
  const exportData = {
    exportedAt: new Date().toISOString(),
    loopId: session.loopId,
    humanId: session.humanId,
    loopTag: loop?.loop_tag ?? null,
    trustScore: loop?.trust_score ?? 0,
    activities: activitiesRes.rows.map((r) => ({ id: r.id, title: r.title, kind: r.kind, createdAt: r.created_at })),
    responsePreferencesCount: prefsRes.rows.length,
    responseCorrectionsCount: correctionsRes.rows.length,
  };

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="openloop-export-${session.loopId.slice(0, 8)}.json"`,
    },
  });
}
