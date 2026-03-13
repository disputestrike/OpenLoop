/**
 * Admin: list corpus sources and ingested rows; ingest new corpus (file or JSON body).
 * GET: list sources + recent ingested_corpus. POST: ingest (admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const header = req.headers.get("x-admin-secret") || req.nextUrl.searchParams.get("admin_secret");
  return !!process.env.ADMIN_SECRET && header === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ sources: [], ingested: [], totalIngested: 0 });
    }
    const [sourcesRes, ingestedRes, countRes] = await Promise.all([
      query<{ id: string; name: string; license: string | null; row_count: string; ingestion_started_at: string; ingestion_finished_at: string | null }>(
        `SELECT id, name, license, row_count, ingestion_started_at, ingestion_finished_at FROM corpus_sources ORDER BY ingestion_started_at DESC LIMIT 100`
      ).catch(() => ({ rows: [] })),
      query<{ id: string; source_type: string; language: string | null; domain: string | null; token_count_approx: number | null; created_at: string }>(
        `SELECT id, source_type, language, domain, token_count_approx, created_at FROM ingested_corpus ORDER BY created_at DESC LIMIT 500`
      ).catch(() => ({ rows: [] })),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ingested_corpus`).catch(() => ({ rows: [{ n: "0" }] })),
    ]);
    return NextResponse.json({
      sources: sourcesRes.rows,
      ingested: ingestedRes.rows,
      totalIngested: parseInt(countRes.rows[0]?.n ?? "0", 10),
    });
  } catch (e) {
    console.error("admin corpus get", e);
    return NextResponse.json({ error: "Failed to load corpus" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string; license?: string; items?: Array<{ content: string; source_type?: string; language?: string; domain?: string; token_count_approx?: number }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body. Expect { name?, license?, items: [{ content, ... }] }" }, { status: 400 });
  }

  const name = (body.name ?? "api_ingest").slice(0, 256);
  const license = typeof body.license === "string" ? body.license.slice(0, 128) : null;
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items[] required with at least one { content }" }, { status: 400 });
  }

  try {
    const sourceRes = await query<{ id: string }>(
      `INSERT INTO corpus_sources (name, license) VALUES ($1, $2) RETURNING id`,
      [name, license]
    );
    const sourceId = sourceRes.rows[0]?.id;
    if (!sourceId) throw new Error("No source id");

    let inserted = 0;
    for (const item of items.slice(0, 5000)) {
      const content = typeof item.content === "string" ? item.content.trim().slice(0, 100000) : "";
      if (!content) continue;
      const sourceType = (item.source_type ?? "openloop_app").slice(0, 32);
      const lang = item.language?.slice(0, 16) ?? null;
      const domain = item.domain?.slice(0, 64) ?? null;
      const tokens = typeof item.token_count_approx === "number" ? item.token_count_approx : null;
      await query(
        `INSERT INTO ingested_corpus (source_id, content, source_type, license, language, domain, token_count_approx) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sourceId, content, sourceType, license, lang, domain, tokens]
      );
      inserted++;
    }

    await query(
      `UPDATE corpus_sources SET row_count = $1, ingestion_finished_at = now() WHERE id = $2`,
      [inserted, sourceId]
    );

    return NextResponse.json({ ok: true, sourceId, inserted });
  } catch (e) {
    console.error("admin corpus ingest", e);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
