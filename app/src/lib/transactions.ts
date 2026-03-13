import { query } from "./db";

export type DealKind = "sandbox" | "real";

/**
 * Record a completed deal between two Loops and update trust scores.
 * Call this when buyer and seller Loops agree and the deal is done.
 */
export async function recordDeal(params: {
  buyerLoopId: string;
  sellerLoopId: string;
  amountCents: number;
  currency?: string;
  kind: DealKind;
}): Promise<{ transactionId: string }> {
  const { buyerLoopId, sellerLoopId, amountCents, kind } = params;
  const currency = params.currency || "USD";

  const txResult = await query<{ id: string }>(
    `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, currency, kind, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, 'completed', now())
     RETURNING id`,
    [buyerLoopId, sellerLoopId, amountCents, currency, kind]
  );
  const transactionId = txResult.rows[0].id;

  const trustDelta = kind === "sandbox" ? 1 : 2;
  for (const loopId of [buyerLoopId, sellerLoopId]) {
    const loopResult = await query<{ trust_score: number }>(
      `SELECT trust_score FROM loops WHERE id = $1`,
      [loopId]
    );
    if (loopResult.rows.length === 0) continue;
    const previous = loopResult.rows[0].trust_score;
    const newScore = Math.min(100, previous + trustDelta);
    await query(
      `UPDATE loops SET trust_score = $1, updated_at = now() WHERE id = $2`,
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
