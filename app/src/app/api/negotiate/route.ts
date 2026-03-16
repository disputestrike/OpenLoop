import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { runLoopToLoopNegotiation, findBusinessLoop } from "@/lib/negotiation-engine";
import { query } from "@/lib/db";
import { checkFraud } from "@/lib/anti-fraud";

/**
 * POST /api/negotiate
 * 
 * Ben's Loop calls this to negotiate with a business.
 * 
 * Body: {
 *   businessTag: string,     // e.g. "Comcast", "att", "netflix"
 *   subject: string,         // e.g. "Monthly cable bill"
 *   currentValue: string,    // e.g. "$127/month"
 *   targetValue: string,     // e.g. "$89/month"
 *   context?: string         // e.g. "5-year customer, never missed payment"
 * }
 * 
 * Returns negotiation result with deal outcome or fallback script.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { businessTag, subject, currentValue, targetValue, context = "" } = body;

  if (!businessTag?.trim()) return NextResponse.json({ error: "businessTag required (e.g. 'Comcast')" }, { status: 400 });
  if (!subject?.trim()) return NextResponse.json({ error: "subject required (e.g. 'Monthly cable bill')" }, { status: 400 });
  if (!currentValue?.trim()) return NextResponse.json({ error: "currentValue required (e.g. '$127/month')" }, { status: 400 });
  if (!targetValue?.trim()) return NextResponse.json({ error: "targetValue required (e.g. '$89/month')" }, { status: 400 });

  // Check if buyer Loop has negotiation skills
  const loopRes = await query<{ skill_tier: number; loop_tag: string; trust_score: number }>(
    "SELECT skill_tier, loop_tag, trust_score FROM loops WHERE id = $1", [session.loopId]
  );
  const loop = loopRes.rows[0];
  if (!loop) return NextResponse.json({ error: "Loop not found" }, { status: 404 });

  if (loop.skill_tier < 1) {
    return NextResponse.json({
      error: "Negotiation requires Tier 1 skills or higher. Enable 'Negotiate & Draft' in your Loop settings.",
      upgradeRequired: true,
    }, { status: 403 });
  }

  // Check if business Loop exists first (for quick status response)
  const businessLoop = await findBusinessLoop(query, businessTag);

  // Notify user in chat that negotiation is starting
  await query(
    `INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)`,
    [session.loopId, businessLoop
      ? `🔍 Found @${businessLoop.loop_tag} on OpenLoop (Trust: ${businessLoop.trust_score}%). Starting Loop-to-Loop negotiation now...`
      : `🔍 Searching for @${businessTag} on OpenLoop... Not found yet. I'll generate a script for you while we wait for them to join.`
    ]
  ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

  try {
    const { fireNegotiationStarted } = await import("@/lib/n8n-integration");
    fireNegotiationStarted(session.loopId, loop.loop_tag ?? "Loop", {
      subject,
      targetLoopTag: businessTag.trim(),
    });
  } catch (_) {}

  // Run the negotiation
  const result = await runLoopToLoopNegotiation({
    buyerLoopId: session.loopId,
    businessSearchTerm: businessTag,
    subject: subject.trim(),
    currentValue: currentValue.trim(),
    targetValue: targetValue.trim(),
    context: context.trim(),
  });

  // If deal reached — record in wallet
  if (result.outcome === "deal" && result.agreedValue) {
    // Estimate savings (parse dollar amounts)
    const currentNum = parseFloat(currentValue.replace(/[^0-9.]/g, "")) || 0;
    const agreedNum = parseFloat(result.agreedValue.replace(/[^0-9.]/g, "")) || 0;
    const savingsCents = Math.round(Math.max(0, currentNum - agreedNum) * 100);

    if (savingsCents > 0) {
      const platformFee = Math.round(savingsCents * 0.1);
      const netCents = savingsCents - platformFee;
      await query(
        `INSERT INTO loop_wallet_events 
           (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
         VALUES ($1, 'savings', $2, $3, $4, $5, 'system')`,
        [session.loopId, savingsCents, platformFee, netCents, `${subject}: ${currentValue} → ${result.agreedValue} via @${result.businessLoopTag}`]
      ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    }
  }

  // Anti-fraud check if real money involved
  if (businessLoop && result.outcome === "deal") {
    await checkFraud({
      buyerLoopId: session.loopId,
      sellerLoopId: businessLoop.id,
      amountCents: 100,
      kind: "sandbox",
    }).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  }

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    agreedValue: result.agreedValue,
    businessLoopTag: result.businessLoopTag,
    contractId: result.contractId,
    roundCount: result.rounds.length,
    rounds: result.rounds,
    fallbackScript: result.fallbackScript,
    message: result.outcome === "deal"
      ? `✅ Deal reached with @${result.businessLoopTag}! ${subject}: ${currentValue} → ${result.agreedValue}`
      : result.outcome === "no_business_loop"
      ? `@${businessTag} hasn't claimed their Loop yet. Script generated.`
      : `Negotiation with @${result.businessLoopTag} reached an impasse after ${result.rounds.length} rounds.`,
  });
}

/**
 * GET /api/negotiate?tag=Comcast
 * Check if a business Loop exists before initiating
 */
export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get("tag");
  if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 });

  const businessLoop = await findBusinessLoop(query, tag);

  return NextResponse.json({
    found: !!businessLoop,
    loopTag: businessLoop?.loop_tag || null,
    trustScore: businessLoop?.trust_score || null,
    message: businessLoop
      ? `✅ @${businessLoop.loop_tag} is on OpenLoop (${businessLoop.trust_score}% trust). Your Loop can negotiate directly.`
      : `@${tag} hasn't joined OpenLoop yet. Your Loop will use a script — and notify you when they join.`,
  });
}
