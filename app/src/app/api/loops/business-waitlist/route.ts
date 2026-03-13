import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * POST /api/loops/business-waitlist
 * Add current user's Loop to waitlist for a business that hasn't joined yet.
 * When that business claims their Loop, all waitlisted Loops get notified.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessName, subject } = await req.json();
  if (!businessName?.trim()) return NextResponse.json({ error: "businessName required" }, { status: 400 });

  await query(
    `INSERT INTO business_join_waitlist (business_name, requested_by_loop_id, subject)
     VALUES (lower($1), $2, $3)
     ON CONFLICT DO NOTHING`,
    [businessName.trim(), session.loopId, subject || null]
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    message: `You'll be notified when @${businessName.toLowerCase()} joins OpenLoop. Your Loop will negotiate directly from day one.`,
  });
}

/**
 * Called internally when a business Loop is claimed.
 * Notifies all waiting Loops.
 */
export async function notifyWaitlistOnBusinessJoin(businessTag: string): Promise<void> {
  const waitlistRes = await query<{
    loop_id: string; loop_tag: string; subject: string | null;
    email: string | null; phone_number: string | null;
  }>(
    `SELECT w.requested_by_loop_id as loop_id, l.loop_tag, w.subject,
            h.email, l.phone_number
     FROM business_join_waitlist w
     JOIN loops l ON l.id = w.requested_by_loop_id
     LEFT JOIN humans h ON l.human_id = h.id
     WHERE w.business_name = lower($1)`,
    [businessTag]
  ).catch(() => ({ rows: [] }));

  if (waitlistRes.rows.length === 0) return;

  const { notifyBusinessJoined } = await import("@/lib/notifications");
  await notifyBusinessJoined({
    waitingLoops: waitlistRes.rows.map(r => ({
      email: r.email,
      phone: r.phone_number,
      loopTag: r.loop_tag,
      subject: r.subject || `Negotiation with @${businessTag}`,
    })),
    businessTag,
  });

  // Clean up waitlist
  await query("DELETE FROM business_join_waitlist WHERE business_name = lower($1)", [businessTag]).catch(() => {});
}
