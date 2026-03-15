/**
 * Shadow Mode — Trust-based action gating
 * 
 * Agents graduate through trust tiers:
 * - Tier 0 (trust < 40): Sandbox only — simulated results, no real actions
 * - Tier 1 (trust 40-59): Research only — can search and summarize, no transactions
 * - Tier 2 (trust 60-79): Guided — can take actions but human must approve first
 * - Tier 3 (trust 80-89): Autonomous — can act independently, human notified after
 * - Tier 4 (trust 90+): Full — unrestricted, can negotiate and transact freely
 * 
 * Shadow mode = Tier 2: agent proposes action, human approves
 */

import { query } from "@/lib/db";

export type TrustTier = 0 | 1 | 2 | 3 | 4;

export interface ActionGate {
  allowed: boolean;
  tier: TrustTier;
  tierName: string;
  requiresApproval: boolean;
  message: string;
}

export function getTrustTier(trustScore: number): TrustTier {
  if (trustScore >= 90) return 4;
  if (trustScore >= 80) return 3;
  if (trustScore >= 60) return 2;
  if (trustScore >= 40) return 1;
  return 0;
}

const TIER_NAMES: Record<TrustTier, string> = {
  0: "Sandbox",
  1: "Research",
  2: "Guided",
  3: "Autonomous",
  4: "Full",
};

/**
 * Check if an action is allowed for a given trust level
 */
export function gateAction(
  trustScore: number,
  actionType: "negotiate" | "order" | "browse" | "find_loop" | "general" | "post"
): ActionGate {
  const tier = getTrustTier(trustScore);
  const tierName = TIER_NAMES[tier];

  // General chat and browsing always allowed
  if (actionType === "general" || actionType === "find_loop") {
    return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
  }

  // Research/browse
  if (actionType === "browse") {
    if (tier >= 1) return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
    return { allowed: false, tier, tierName, requiresApproval: false, message: "Your Loop needs a higher trust score to research the web. Keep engaging to build trust." };
  }

  // Posting
  if (actionType === "post") {
    if (tier >= 1) return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
    return { allowed: false, tier, tierName, requiresApproval: false, message: "Your Loop needs a higher trust score to post to the feed." };
  }

  // Orders and bookings
  if (actionType === "order") {
    if (tier >= 3) return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
    if (tier >= 2) return { allowed: true, tier, tierName, requiresApproval: true, message: "Your Loop can complete this order, but needs your approval first." };
    if (tier >= 1) return { allowed: false, tier, tierName, requiresApproval: false, message: "Your Loop needs Silver tier (trust 80+) to place orders autonomously. Currently in Research mode." };
    return { allowed: false, tier, tierName, requiresApproval: false, message: "Your Loop is in Sandbox mode. Keep engaging to unlock order capabilities." };
  }

  // Negotiations
  if (actionType === "negotiate") {
    if (tier >= 3) return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
    if (tier >= 2) return { allowed: true, tier, tierName, requiresApproval: true, message: "Your Loop can negotiate, but needs your approval to commit to deals." };
    if (tier >= 1) return { allowed: true, tier, tierName, requiresApproval: true, message: "Your Loop can attempt negotiations in sandbox mode. Results are simulated." };
    return { allowed: true, tier, tierName, requiresApproval: true, message: "Sandbox negotiation — results are simulated for practice." };
  }

  return { allowed: true, tier, tierName, requiresApproval: false, message: "" };
}

/**
 * Record an approved/rejected action for trust building
 */
export async function recordActionOutcome(
  loopId: string,
  actionType: string,
  approved: boolean,
  outcome: "success" | "failure" | "pending"
): Promise<void> {
  try {
    // Successful approved actions build trust
    if (approved && outcome === "success") {
      await query(
        `UPDATE loops SET trust_score = LEAST(100, trust_score + 1) WHERE id = $1`,
        [loopId]
      );
    }
    // Failed actions decrease trust slightly
    if (outcome === "failure") {
      await query(
        `UPDATE loops SET trust_score = GREATEST(10, trust_score - 1) WHERE id = $1`,
        [loopId]
      );
    }
  } catch {
    // Non-critical
  }
}
