import { query } from "./db";
import { checkFraud, getTrustWeight } from "./anti-fraud";

export type DealKind = "sandbox" | "real";

/**
 * Record a completed deal between two Loops and update trust scores.
 * Runs anti-fraud check before recording. Uses weighted trust delta.
 */
export async function recordDeal(params: {
  buyerLoopId: string;
  sellerLoopId: string;
  amountCents: number;
  currency?: string;
  kind: DealKind;
  verificationTier?: string;
  skipFraudCheck?: boolean;
}): Promise<{ transactionId: string; blocked?: boolean; reason?: string }> {
  const { buyerLoopId, sellerLoopId, amountCents, kind, verificationTier, skipFraudCheck } = params;
  const currency = params.currency || "USD";

  // Anti-fraud check
  if (!skipFraudCheck) {
    const fraudCheck = await checkFraud({ buyerLoopId, sellerLoopId, amountCents, kind });
    if (!fraudCheck.allowed) {
      return { transactionId: "", blocked: true, reason: fraudCheck.reason };
    }
  }

  const txResult = await query<{ id: string }>(
    `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, 'completed', now())
     RETURNING id`,
    [buyerLoopId, sellerLoopId, amountCents, currency, kind]
  );
  const transactionId = txResult.rows[0].id;

  // Weighted trust delta — real transactions count more than sandbox
  const baseWeight = getTrustWeight(kind, verificationTier);
  const trustDelta = Math.round(2 * baseWeight);

  for (const loopId of [buyerLoopId, sellerLoopId]) {
    const loopResult = await query<{ trust_score: number }>(
      "SELECT trust_score FROM loops WHERE id = $1", [loopId]
    );
    if (loopResult.rows.length === 0) continue;
    const previous = loopResult.rows[0].trust_score;
    const newScore = Math.min(100, previous + trustDelta);
    await query(
      "UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2",
      [newScore, loopId]
    );
    await query(
      `INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason, reference_id)
       VALUES ($1, $2, $3, 'deal_completed', $4)`,
      [loopId, previous, newScore, transactionId]
    );
  }

  return { transactionId };
}
