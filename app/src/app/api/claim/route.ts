import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { setSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { checkRateLimitClaim } from "@/lib/rate-limit";

// GET /api/claim?token=... — Validate token, mark claimed, set session, return redirect URL
export async function GET(req: NextRequest) {
  if (await checkRateLimitClaim(req)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const linkResult = await query<{
    id: string;
    loop_id: string;
    email: string;
    used_at: string | null;
    expires_at: string;
  }>(
    `SELECT id, loop_id, email, used_at, expires_at FROM claim_links WHERE token = $1`,
    [token]
  );

  if (linkResult.rows.length === 0) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const link = linkResult.rows[0];
  if (link.used_at) {
    return NextResponse.json({ error: "Link already used" }, { status: 400 });
  }
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 400 });
  }

  await query(
    `UPDATE claim_links SET used_at = now() WHERE id = $1`,
    [link.id]
  );
  // Ensure human exists (claim-existing flow may not have created one)
  await query(
    `INSERT INTO humans (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
    [link.email]
  );
  // Set default loop_tag so Loop appears in directory (user can change later)
  const defaultTag = `user_${link.loop_id.replace(/-/g, "").slice(0, 8)}`;
  await query(
    `UPDATE loops SET human_id = (SELECT id FROM humans WHERE email = $1), status = 'active', claimed_at = now(), email = $1, loop_tag = COALESCE(loop_tag, $3), updated_at = now() WHERE id = $2`,
    [link.email, link.loop_id, defaultTag]
  );

  // If this is a business Loop being claimed — notify the waitlist
  const claimedLoop = await query<{ is_business: boolean; loop_tag: string }>(
    "SELECT is_business, loop_tag FROM loops WHERE id = $1", [link.loop_id]
  ).catch(() => ({ rows: [] }));
  if (claimedLoop.rows[0]?.is_business && claimedLoop.rows[0]?.loop_tag) {
    const { notifyWaitlistOnBusinessJoin } = await import("@/lib/business-waitlist");
    notifyWaitlistOnBusinessJoin(claimedLoop.rows[0].loop_tag).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  }

  const humanResult = await query<{ id: string }>(
    `SELECT id FROM humans WHERE email = $1`,
    [link.email]
  );
  const humanId = humanResult.rows[0].id;

  const sessionToken = await setSession({ humanId, loopId: link.loop_id });

  await logAudit({ actorType: "human", actorId: humanId, action: "claim", resourceType: "claim_link", resourceId: link.id });

  // New users go to onboarding, returning users go to dashboard
  const loopData = await query<{ onboarding_complete: boolean }>(
    `SELECT onboarding_complete FROM loops WHERE id = $1`,
    [link.loop_id]
  );
  const onboardingComplete = loopData.rows[0]?.onboarding_complete ?? false;
  const redirectPath = onboardingComplete ? "/dashboard" : "/onboarding";

  const res = NextResponse.json({
    success: true,
    redirect: `${appUrl}${redirectPath}`,
  });
  res.cookies.set("session", sessionToken, {
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    sameSite: "lax",
  });
  return res;
}
