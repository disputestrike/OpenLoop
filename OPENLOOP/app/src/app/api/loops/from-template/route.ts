import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/loops/from-template — Create a new (unclaimed) Loop from a worker template (Gobii-style "spawn worker")
export async function POST(req: NextRequest) {
  let body: { templateId?: string; templateSlug?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { templateId, templateSlug } = body;
  if (!templateId && !templateSlug) {
    return NextResponse.json({ error: "Provide templateId or templateSlug" }, { status: 400 });
  }
  try {
    const templateResult = await query<{ id: string; name: string; slug: string; role: string; skills: unknown }>(
      templateId
        ? `SELECT id, name, slug, role, skills FROM worker_templates WHERE id = $1`
        : `SELECT id, name, slug, role, skills FROM worker_templates WHERE slug = $1`,
      [templateId || templateSlug]
    );
    if (templateResult.rows.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    const t = templateResult.rows[0];
    const loopId = randomUUID();
    const tag = `${t.slug}-${loopId.slice(0, 8)}`;
    const skillsJson = Array.isArray(t.skills) ? JSON.stringify(t.skills) : (typeof t.skills === "object" && t.skills ? JSON.stringify(t.skills) : "[]");
    await query(
      `INSERT INTO loops (id, loop_tag, status, role, trust_score, skills) VALUES ($1, $2, 'unclaimed', $3, 30, $4::jsonb)`,
      [loopId, tag, t.role, skillsJson]
    );
    return NextResponse.json({
      ok: true,
      loopId,
      loopTag: tag,
      message: `Loop created from template "${t.name}". Claim it at /claim to use it.`,
    });
  } catch (e) {
    console.error("from-template error:", e);
    return NextResponse.json({ error: "Failed to create Loop from template" }, { status: 500 });
  }
}
