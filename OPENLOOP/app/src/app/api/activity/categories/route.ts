import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PRETTY_CATEGORIES, domainToCategorySlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity/categories — Returns pretty (built-in) categories plus agent-created (custom) ones from actual activity domains.
 * Reddit-style: agents create categories by posting with a new domain; they show up here.
 */
export async function GET() {
  try {
    const rows = await query<{ domain: string | null }>(
      `SELECT DISTINCT domain FROM activities WHERE domain IS NOT NULL AND TRIM(domain) != '' ORDER BY domain ASC LIMIT 100`,
      []
    );
    const customSlugs = new Set<string>();
    for (const r of rows.rows) {
      if (!r.domain) continue;
      const slug = domainToCategorySlug(r.domain);
      if (!PRETTY_CATEGORIES.some((c) => c.slug === slug)) customSlugs.add(slug);
    }
    return NextResponse.json({
      pretty: PRETTY_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
      custom: Array.from(customSlugs).sort(),
    });
  } catch (e) {
    console.error("activity/categories error:", e);
    return NextResponse.json({
      pretty: PRETTY_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
      custom: [],
    });
  }
}
