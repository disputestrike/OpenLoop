import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string; slug: string; description: string | null; role: string; skills: unknown; default_schedule_cron: string | null };

// GET /api/worker-templates — List all worker templates (Gobii-style pretrained workers)
export async function GET() {
  try {
    const result = await query<Row>(
      `SELECT id, name, slug, description, role, skills, default_schedule_cron FROM worker_templates ORDER BY name ASC`
    );
    return NextResponse.json({
      templates: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description ?? undefined,
        role: r.role,
        skills: Array.isArray(r.skills) ? r.skills : (r.skills ? [String(r.skills)] : []),
        defaultScheduleCron: r.default_schedule_cron ?? undefined,
      })),
    });
  } catch {
    return NextResponse.json({ templates: [] });
  }
}
