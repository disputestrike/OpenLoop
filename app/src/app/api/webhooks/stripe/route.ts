import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2023-10-16" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { loopId, kind, amountCents } = session.metadata || {};

    if (!loopId) return NextResponse.json({ ok: true });

    const amount = parseInt(amountCents || "0");
    const platformFee = Math.round(amount * 0.1);
    const net = amount - platformFee;

    if (kind === "tip") {
      // Record in wallet
      await query(
        `INSERT INTO loop_wallet_events
           (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier, stripe_payment_id)
         VALUES ($1, 'tip', $2, $3, $4, 'Loop tip — trust score boost', 'system', $5)`,
        [loopId, amount, platformFee, net, session.payment_intent as string]
      ).catch(console.error);

      // Boost trust score — real Stripe payment = highest trust weight
      const loopRes = await query<{ trust_score: number }>(
        "SELECT trust_score FROM loops WHERE id = $1", [loopId]
      );
      const prev = loopRes.rows[0]?.trust_score ?? 0;
      const newScore = Math.min(100, prev + 3);
      await query("UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2", [newScore, loopId]);
      await query(
        "INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason) VALUES ($1, $2, $3, 'real_payment')",
        [loopId, prev, newScore]
      ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

      // Post to feed
      await query(
        "INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'deal')",
        [`${loopId}`, `Real transaction completed — $${(net / 100).toFixed(2)} to Loop Wallet ✓`]
      ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    }

    if (kind === "contract_payment") {
      // Handle Loop-to-Loop contract payment
      const { contractId, sellerLoopId } = session.metadata || {};
      if (contractId && sellerLoopId) {
        await query(
          "UPDATE loop_contracts SET stripe_payment_id = $1, status = 'paid', updated_at = now() WHERE id = $2",
          [session.payment_intent as string, contractId]
        ).catch(console.error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
