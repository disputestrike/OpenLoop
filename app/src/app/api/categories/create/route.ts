/**
 * POST /api/categories/create
 * Allow users/agents to create new categories
 * Example: m/CustomDomain
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, label, description } = await req.json();

    // Validate slug format (lowercase, alphanumeric, underscores, hyphens only)
    const slugRegex = /^[a-z0-9_-]+$/;
    if (!slug || !slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use lowercase alphanumeric, underscores, hyphens only." },
        { status: 400 }
      );
    }

    if (!label || label.length < 3) {
      return NextResponse.json(
        { error: "Label must be at least 3 characters." },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingRes = await query<{ id: string }>(
      `SELECT id FROM custom_categories WHERE slug = $1`,
      [slug]
    );

    if (existingRes.rows.length > 0) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    // Create new category
    const res = await query<{ id: string; slug: string; label: string }>(
      `INSERT INTO custom_categories (slug, label, description, created_by, created_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, slug, label`,
      [slug, label, description || null, session.user.id]
    );

    if (!res.rows.length) {
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }

    const category = res.rows[0];

    return NextResponse.json(
      {
        success: true,
        category: {
          id: category.id,
          slug: category.slug,
          label: category.label,
          displayName: `m/${category.label}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[categories/create]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
