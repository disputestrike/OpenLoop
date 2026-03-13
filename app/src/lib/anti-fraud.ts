/**
 * OpenLoop Anti-Fraud Middleware
 * Runs on every transaction attempt before it is recorded.
 * Implements velocity checks, graph analysis, and trust verification gates.
 */

import { query } from "@/lib/db";

export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  flagged?: boolean;
}

/**
 * Master fraud check — run before recording any transaction or trust event.
 */
export async function checkFraud(params: {
  buyerLoopId: string;
  sellerLoopId: string;
  amountCents: number;
  kind: "sandbox" | "real";
}): Promise<FraudCheckResult> {
  const { buyerLoopId, sellerLoopId, amountCents } = params;

  // ── 1. Self-dealing check ──────────────────────────────────
  if (buyerLoopId === sellerLoopId) {
    return { allowed: false, reason: "A Loop cannot transact with itself" };
  }

  // ── 2. Get both Loops ─────────────────────────────────────
  const loopsRes = await query<{
    id: string; trust_score: number; human_id: string | null;
    created_at: string; status: string;
  }>(
    "SELECT id, trust_score, human_id, created_at, status FROM loops WHERE id = ANY($1::uuid[])",
    [[buyerLoopId, sellerLoopId]]
  );
  const loops = loopsRes.rows;
  const buyer = loops.find(l => l.id === buyerLoopId);
  const seller = loops.find(l => l.id === sellerLoopId);

  if (!buyer || !seller) return { allowed: false, reason: "One or both Loops not found" };
  if (buyer.status !== "active" || seller.status !== "active") {
    return { allowed: false, reason: "Both Loops must be active to transact" };
  }

  // ── 3. Velocity check — new Loops capped at 10 txns/day ───
  const buyerAgeDays = (Date.now() - new Date(buyer.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (buyerAgeDays < 30) {
    const dailyCount = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM transactions
       WHERE buyer_loop_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [buyerLoopId]
    );
    const txCount = parseInt(dailyCount.rows[0]?.count || "0");
    if (txCount >= 10) {
      await flagLoop(buyerLoopId, "velocity_limit_exceeded");
      return {
        allowed: false,
        flagged: true,
        reason: "Daily transaction limit reached for new Loops. Limit resets in 24 hours.",
      };
    }
  }

  // ── 4. Exclusive pair check — fraud signal ─────────────────
  const pairCheck = await query<{ pair_count: string; total_count: string }>(
    `SELECT
       (SELECT COUNT(*)::text FROM transactions WHERE (buyer_loop_id = $1 AND seller_loop_id = $2) OR (buyer_loop_id = $2 AND seller_loop_id = $1)) as pair_count,
       (SELECT COUNT(*)::text FROM transactions WHERE buyer_loop_id = $1 OR seller_loop_id = $1) as total_count`,
    [buyerLoopId, sellerLoopId]
  );
  const pairCount = parseInt(pairCheck.rows[0]?.pair_count || "0");
  const totalCount = parseInt(pairCheck.rows[0]?.total_count || "0");

  if (totalCount > 5 && pairCount / totalCount > 0.8) {
    await flagLoop(buyerLoopId, "exclusive_pair_fraud");
    await flagLoop(sellerLoopId, "exclusive_pair_fraud");
    return {
      allowed: false,
      flagged: true,
      reason: "Transaction pattern flagged for review. Over 80% of transactions are between these two Loops.",
    };
  }

  // ── 5. Trust gate — human verification required above 70% ──
  if (buyer.trust_score >= 70 && !buyer.human_id) {
    return {
      allowed: false,
      reason: "Human verification required to transact above 70% trust score. Check your email to verify.",
    };
  }

  // ── 6. Amount limit check for unverified Loops ─────────────
  if (!buyer.human_id && amountCents > 500) {
    return {
      allowed: false,
      reason: "Unverified Loops are limited to $5.00 per transaction. Verify your email to increase limits.",
    };
  }

  return { allowed: true };
}

async function flagLoop(loopId: string, reason: string): Promise<void> {
  await query(
    `UPDATE loops SET status = 'flagged', updated_at = now() WHERE id = $1`,
    [loopId]
  ).catch(() => {});
  await query(
    `INSERT INTO activities (loop_id, title, kind) VALUES ($1, $2, 'system')`,
    [loopId, `Loop flagged: ${reason}`]
  ).catch(() => {});
}

/**
 * Trust score fraud check — run before awarding trust points.
 * Sandbox transactions count at 0.5x, real Stripe at 1.5x.
 */
export function getTrustWeight(kind: "sandbox" | "real", verificationTier?: string): number {
  let base = kind === "real" ? 1.5 : 0.5;
  if (verificationTier === "system") base *= 1.5;
  else if (verificationTier === "evidence") base *= 1.2;
  return base;
}
