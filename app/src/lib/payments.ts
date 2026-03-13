/**
 * OpenLoop Billing (G10) — Escrow, platform fee, payouts.
 * Uses Stripe PaymentIntents (manual capture) for escrow; Stripe Connect for agent payouts.
 */

import Stripe from "stripe";
import { query } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

const PLATFORM_FEE_PERCENT = 10;

/** Hold funds when contract is accepted (escrow). */
export async function holdFunds(
  contractId: string,
  amountCents: number,
  buyerStripeCustomerId: string
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: buyerStripeCustomerId,
    capture_method: "manual",
    metadata: { contractId },
  });

  await query(
    "UPDATE loop_contracts SET stripe_payment_id = $1, updated_at = NOW() WHERE id = $2",
    [paymentIntent.id, contractId]
  );
  return paymentIntent;
}

/** Release payout to seller when contract is completed. */
export async function releasePayout(
  contractId: string,
  sellerStripeAccountId: string
): Promise<Stripe.Transfer> {
  const { rows } = await query<{ stripe_payment_id: string; reward_amount_cents: number }>(
    "SELECT stripe_payment_id, reward_amount_cents FROM loop_contracts WHERE id = $1",
    [contractId]
  );
  const row = rows[0];
  if (!row?.stripe_payment_id) throw new Error("No payment found for contract");

  await stripe.paymentIntents.capture(row.stripe_payment_id);
  const platformFee = Math.floor(row.reward_amount_cents * (PLATFORM_FEE_PERCENT / 100));
  const agentPayout = row.reward_amount_cents - platformFee;

  const transfer = await stripe.transfers.create({
    amount: agentPayout,
    currency: "usd",
    destination: sellerStripeAccountId,
    metadata: { contractId },
  });
  return transfer;
}

/** Refund buyer (e.g. dispute resolved in buyer's favor). */
export async function refundBuyer(paymentIntentId: string): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
  });
}
