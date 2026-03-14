import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * POST /api/loops/business-waitlist
 * Join waitlist for a business that hasn't claimed their Loop yet.
 * When they join, all waitlisted Loops get notified automatically.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessName, subject } = await req.json();
  if (!businessName?.trim()) return NextResponse.json({ error: "businessName required" }, { status: 400 });

  await query(
    `INSERT INTO business_join_waitlist (business_name, requested_by_loop_id, subject)
     VALUES (lower($1), $2, $3)`,
    [businessName.trim(), session.loopId, subject || null]
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    message: `You'll be notified when @${businessName.toLowerCase()} joins OpenLoop. Your Loop will negotiate directly from day one.`,
  });
}
