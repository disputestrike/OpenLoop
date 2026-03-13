/**
 * GET /api/analytics/training-export
 * Anonymized export for training pipeline: llm_interactions + preferences + corrections.
 * Admin only. Use for RLHF / SFT datasets.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest): boolean {
  const header = req.headers.get("x-admin-secret") ?? req.nextUrl.searchParams.get("admin_secret");
  return !!process.env.ADMIN_SECRET && header === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden", message: "Valid admin_secret required (query or X-Admin-Secret header)" }, { status: 403 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "10000", 10), 50000);
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        interactions: [],
        preferences: [],
        corrections: [],
        ingestedCorpusCount: 0,
        message: "No database",
      });
    }

    const [interactionsRes, prefsRes, correctionsRes, corpusCountRes] = await Promise.all([
      query<{ id: string; kind: string; prompt: string; response: string; source: string | null; language: string | null; created_at: string }>(
        `SELECT id, kind, prompt, response, source, language, created_at FROM llm_interactions ORDER BY created_at DESC LIMIT $1`,
        [limit]
      ).catch(() => ({ rows: [] })),
      query<{ prompt_id: string; chosen_response_id: string | null; rejected_response_id: string | null; created_at: string }>(
        `SELECT prompt_id, chosen_response_id, rejected_response_id, created_at FROM response_preferences ORDER BY created_at DESC LIMIT $1`,
        [limit]
      ).catch(() => ({ rows: [] })),
      query<{ original_response_id: string; corrected_text: string; created_at: string }>(
        `SELECT original_response_id, corrected_text, created_at FROM response_corrections ORDER BY created_at DESC LIMIT $1`,
        [limit]
      ).catch(() => ({ rows: [] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ingested_corpus WHERE can_use_for_training = true`).catch(() => ({ rows: [{ n: "0" }] })),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      interactions: interactionsRes.rows,
      preferences: prefsRes.rows,
      corrections: correctionsRes.rows,
      ingestedCorpusCount: parseInt(corpusCountRes.rows[0]?.n ?? "0", 10),
      message: "Anonymized; no human/loop identifiers. Use for SFT/RLHF pipelines.",
    });
  } catch (e) {
    console.error("training-export", e);
    return NextResponse.json({ error: "Export failed", message: (e as Error)?.message ?? "Unknown error" }, { status: 500 });
  }
}
