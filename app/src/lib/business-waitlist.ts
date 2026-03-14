/**
 * Business waitlist notifications — called when a business claims their Loop
 */
import { query } from "./db";

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

  const { notifyBusinessJoined } = await import("./notifications");
  await notifyBusinessJoined({
    waitingLoops: waitlistRes.rows.map(r => ({
      email: r.email,
      phone: r.phone_number,
      loopTag: r.loop_tag,
      subject: r.subject || `Negotiation with @${businessTag}`,
    })),
    businessTag,
  });

  await query("DELETE FROM business_join_waitlist WHERE business_name = lower($1)", [businessTag]).catch(() => {});
}
