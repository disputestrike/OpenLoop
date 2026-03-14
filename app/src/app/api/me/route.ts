import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/claim-auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [loopRes, walletRes, inboxRes] = await Promise.all([
    query<{
      id: string; loop_tag: string | null; trust_score: number; role: string;
      email: string | null; loop_email?: string | null; webhook_url?: string | null;
      persona?: string | null; onboarding_complete?: boolean; skill_tier?: number;
      phone_number?: string | null; is_business?: boolean;
    }>(
      `SELECT id, loop_tag, trust_score, role, email, loop_email, webhook_url,
              persona, onboarding_complete, skill_tier, phone_number, is_business
       FROM loops WHERE id = $1`,
      [session.loopId]
    ).catch(() => query<{ id:string; loop_tag:string|null; trust_score:number; role:string; email:string|null }>(
      `SELECT id, loop_tag, trust_score, role, email FROM loops WHERE id = $1`, [session.loopId]
    )),
    query<{ balance: string }>(
      `SELECT COALESCE(SUM(net_cents),0)::text as balance FROM loop_wallet_events WHERE loop_id = $1`,
      [session.loopId]
    ).catch(() => ({ rows: [{ balance: "0" }] })),
    query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM loop_messages WHERE to_loop_id = $1 AND read_at IS NULL`,
      [session.loopId]
    ).catch(() => ({ rows: [{ count: "0" }] })),
  ]);

  if (loopRes.rows.length === 0) return NextResponse.json({ error: "Loop not found" }, { status: 404 });

  const loop = loopRes.rows[0];
  return NextResponse.json({
    humanId: session.humanId,
    loop: {
      id: loop.id,
      loopTag: loop.loop_tag,
      trustScore: loop.trust_score,
      role: loop.role,
      email: loop.email,
      loopEmail: (loop as { loop_email?: string | null }).loop_email ?? null,
      webhookUrl: (loop as { webhook_url?: string | null }).webhook_url ?? null,
      persona: (loop as { persona?: string | null }).persona ?? "personal",
      onboardingComplete: (loop as { onboarding_complete?: boolean }).onboarding_complete ?? false,
      skillTier: (loop as { skill_tier?: number }).skill_tier ?? 0,
      phoneNumber: (loop as { phone_number?: string | null }).phone_number ?? null,
      isBusiness: (loop as { is_business?: boolean }).is_business ?? false,
      walletBalanceCents: parseInt(walletRes.rows[0]?.balance || "0"),
      unreadMessages: parseInt(inboxRes.rows[0]?.count || "0"),
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const loopEmail = typeof body.loopEmail === "string" ? body.loopEmail.trim().slice(0, 256) || null : undefined;
  const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim().slice(0, 2048) || null : undefined;
  if (loopEmail === undefined && webhookUrl === undefined) return NextResponse.json({ error: "No updates" }, { status: 400 });
  const updates: string[] = []; const values: (string | null)[] = []; let i = 1;
  if (loopEmail !== undefined) { updates.push(`loop_email = $${i}`); values.push(loopEmail); i++; }
  if (webhookUrl !== undefined) { updates.push(`webhook_url = $${i}`); values.push(webhookUrl); i++; }
  values.push(session.loopId);
  await query(`UPDATE loops SET ${updates.join(", ")} WHERE id = $${i}`, values);
  return NextResponse.json({ ok: true });
}
