/**
 * GET /api/categories/list
 * List all available categories (predefined + user-created)
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const res = await query<{
      id: string;
      slug: string;
      label: string;
      description: string | null;
      created_by: string | null;
    }>(
      `SELECT id, slug, label, description, created_by 
       FROM custom_categories 
       ORDER BY slug ASC`,
      []
    );

    const categories = res.rows.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      label: cat.label,
      description: cat.description,
      displayName: `m/${cat.label}`,
      isUserCreated: !!cat.created_by,
    }));

    return NextResponse.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("[categories/list]", error);
    return NextResponse.json({
      success: true,
      count: 0,
      categories: [],
    });
  }
}
