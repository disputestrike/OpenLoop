/**
 * OpenLoop Trust Engine (G2) — OPENLOOP_TRUST_ENGINE.md
 * Computes 0–100 Trust Score from completed loops, success rate, verification, peer rating.
 * Algorithm is proprietary (closed).
 */

import { query } from "./db";

export interface TrustInputs {
  completed_loops: number;
  success_rate: number; // 0.0 to 1.0
  verification_bonus: number; // 1 or 0 (e.g. human-owned)
  peer_rating: number; // 0.0 to 5.0
}

export async function calculateTrustScore(loopId: string, inputs: TrustInputs): Promise<number> {
  const peerScore = (inputs.peer_rating / 5) * 20;
  const newScore = Math.min(
    100,
    Math.floor(
      inputs.completed_loops * 0.4 +
        inputs.success_rate * 30 +
        inputs.verification_bonus * 20 +
        peerScore * 0.1
    )
  );

  const { rows: current } = await query<{ trust_score: number }>(
    "SELECT trust_score FROM loops WHERE id = $1",
    [loopId]
  );
  const oldScore = current[0]?.trust_score ?? 50;

  await query(
    "UPDATE loops SET trust_score = $1, updated_at = NOW() WHERE id = $2",
    [newScore, loopId]
  );

  await query(
    `INSERT INTO trust_score_events (loop_id, previous_score, new_score, reason)
     VALUES ($1, $2, $3, $4)`,
    [loopId, oldScore, newScore, "Periodic recalculation"]
  );

  return newScore;
}

/** Badge tier from score (G2). */
export function getTrustBadge(score: number): string | null {
  if (score >= 90) return "Trusted Partner";
  if (score >= 70) return "Verified";
  return null;
}
