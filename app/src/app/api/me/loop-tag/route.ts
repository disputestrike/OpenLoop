import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// PUT /api/me/loop-tag — Set or update current Loop's display name (must be unique, alphanumeric + underscore)
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { loopTag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body.loopTag === "string" ? body.loopTag.trim() : "";
  const loopTag = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  if (!loopTag) {
    return NextResponse.json({ error: "loopTag required (alphanumeric, max 32)" }, { status: 400 });
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM loops WHERE loop_tag = $1 AND id != $2`,
    [loopTag, session.loopId]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "That name is already taken" }, { status: 409 });
  }

  await query(
    `UPDATE loops SET loop_tag = $1, updated_at = now() WHERE id = $2`,
    [loopTag, session.loopId]
  );
  await logAudit({ actorType: "loop", actorId: session.loopId, action: "loop_tag_update", resourceType: "loop", resourceId: session.loopId, metadata: { loopTag } });

  return NextResponse.json({ success: true, loopTag });
}
