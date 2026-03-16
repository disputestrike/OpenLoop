/**
 * PHASE 3: DISPUTE RESOLUTION & ESCROW
 * Handle disagreements, refunds, and arbitration
 * 
 * Flow:
 * 1. User hires agent (payment goes to escrow)
 * 2. Agent completes task (or not)
 * 3. User approves (or disputes)
 * 4. If dispute: admin review + refund
 */

export interface Escrow {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  status: "held" | "released" | "refunded" | "disputed";
  held_at: Date;
  released_at?: Date;
  dispute_id?: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string; // "task_incomplete" | "poor_quality" | "timeout" | "other"
  description: string;
  evidence?: string; // URL to screenshot, email, etc.
  created_at: Date;
  status: "open" | "under_review" | "resolved" | "escalated";
  admin_notes?: string;
  resolution?: "refund" | "partial_refund" | "dismiss";
  resolved_at?: Date;
  resolved_by?: string;
}

/**
 * Escrow Manager - Hold and release funds
 */
export class EscrowManager {
  /**
   * Create escrow when hire is initiated
   */
  async createEscrow(
    transactionId: string,
    buyerId: string,
    sellerId: string,
    amountCents: number
  ): Promise<Escrow> {
    // INSERT INTO escrow (transaction_id, buyer_id, seller_id, amount_cents, status, held_at)
    // VALUES ($1, $2, $3, $4, 'held', NOW())

    const escrow: Escrow = {
      id: transactionId, // Use transaction ID as escrow ID
      transaction_id: transactionId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount_cents: amountCents,
      status: "held",
      held_at: new Date(),
    };

    console.log(`[escrow] Created escrow for transaction ${transactionId}: $${amountCents / 100}`);
    return escrow;
  }

  /**
   * Release funds to seller (buyer approved outcome)
   */
  async releaseEscrow(transactionId: string): Promise<boolean> {
    try {
      // UPDATE escrow SET status = 'released', released_at = NOW()
      // WHERE transaction_id = $1

      // Transfer to seller wallet
      // INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
      // VALUES ($1, $2, 'escrow_release', $3)

      console.log(`[escrow] Released escrow for transaction ${transactionId}`);
      return true;
    } catch (error) {
      console.error(`[escrow] Release failed for ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Refund buyer (dispute resolved in buyer's favor)
   */
  async refundEscrow(transactionId: string, reason: string): Promise<boolean> {
    try {
      // UPDATE escrow SET status = 'refunded'
      // WHERE transaction_id = $1

      // Return to buyer wallet
      // INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
      // VALUES ($1, $2, 'dispute_refund', $3)

      console.log(`[escrow] Refunded escrow for ${transactionId}: ${reason}`);
      return true;
    } catch (error) {
      console.error(`[escrow] Refund failed for ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Partial refund (split decision)
   */
  async partialRefund(
    transactionId: string,
    buyerRefundCents: number,
    sellerPayoutCents: number
  ): Promise<boolean> {
    try {
      // Verify amounts add up to original
      // Then create two transactions:
      // 1. Return buyerRefundCents to buyer
      // 2. Send sellerPayoutCents to seller

      console.log(`[escrow] Partial refund for ${transactionId}: $${buyerRefundCents / 100} to buyer, $${sellerPayoutCents / 100} to seller`);
      return true;
    } catch (error) {
      console.error(`[escrow] Partial refund failed for ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Auto-release after 7 days if no dispute
   */
  async autoReleaseAfterDays(days: number = 7): Promise<number> {
    try {
      // SELECT escrow that are:
      // - status = 'held'
      // - held_at > NOW() - interval '7 days'
      // - no matching dispute
      // Then release them

      // Return count released
      return 0;
    } catch (error) {
      console.error(`[escrow] Auto-release failed:`, error);
      return 0;
    }
  }
}

/**
 * Dispute Manager - Handle disagreements
 */
export class DisputeManager {
  /**
   * Create dispute (buyer claims task not completed)
   */
  async createDispute(
    transactionId: string,
    buyerId: string,
    sellerId: string,
    reason: string,
    description: string,
    evidence?: string
  ): Promise<Dispute> {
    // Validate reason
    const validReasons = ["task_incomplete", "poor_quality", "timeout", "other"];
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid dispute reason: ${reason}`);
    }

    // CREATE dispute
    // INSERT INTO disputes (transaction_id, buyer_id, seller_id, reason, description, evidence, created_at, status)
    // VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'open')

    const dispute: Dispute = {
      id: transactionId,
      transaction_id: transactionId,
      buyer_id: buyerId,
      seller_id: sellerId,
      reason,
      description,
      evidence,
      created_at: new Date(),
      status: "open",
    };

    // UPDATE escrow SET status = 'disputed', dispute_id = $1 WHERE transaction_id = $2
    console.log(`[dispute] Created dispute for transaction ${transactionId}: ${reason}`);

    return dispute;
  }

  /**
   * Get dispute details
   */
  async getDispute(transactionId: string): Promise<Dispute | null> {
    // SELECT * FROM disputes WHERE transaction_id = $1
    return null;
  }

  /**
   * Admin review dispute
   */
  async reviewDispute(
    transactionId: string,
    adminId: string,
    resolution: "refund" | "partial_refund" | "dismiss",
    adminNotes: string
  ): Promise<Dispute> {
    // UPDATE disputes SET status = 'under_review', admin_notes = $2, reviewed_by = $3
    // WHERE transaction_id = $1

    // Execute resolution
    if (resolution === "refund") {
      // Full refund to buyer
      // await escrowManager.refundEscrow(transactionId, "Dispute: Full refund");
    } else if (resolution === "partial_refund") {
      // 50/50 split
      // await escrowManager.partialRefund(transactionId, amount/2, amount/2);
    } else {
      // Dismiss - release to seller
      // await escrowManager.releaseEscrow(transactionId);
    }

    const dispute: Dispute = {
      id: transactionId,
      transaction_id: transactionId,
      buyer_id: "",
      seller_id: "",
      reason: "",
      description: "",
      created_at: new Date(),
      status: "resolved",
      resolution,
      admin_notes: adminNotes,
      resolved_by: adminId,
      resolved_at: new Date(),
    };

    console.log(`[dispute] Resolved ${transactionId}: ${resolution}`);
    return dispute;
  }

  /**
   * Escalate to higher authority
   */
  async escalateDispute(transactionId: string, reason: string): Promise<void> {
    // UPDATE disputes SET status = 'escalated', escalation_reason = $2
    // WHERE transaction_id = $1
    // Send notification to senior admin

    console.log(`[dispute] Escalated ${transactionId}: ${reason}`);
  }
}

/**
 * API Endpoint: File dispute
 * POST /api/transactions/{transactionId}/dispute
 * Body: { reason, description, evidence }
 */
export async function createDisputeEndpoint(
  transactionId: string,
  buyerId: string,
  reason: string,
  description: string,
  evidence?: string
): Promise<{ success: boolean; dispute?: Dispute; error?: string }> {
  try {
    // Get transaction details
    // const transaction = await getTransaction(transactionId);

    const disputeManager = new DisputeManager();
    const dispute = await disputeManager.createDispute(
      transactionId,
      buyerId,
      "", // sellerId from transaction
      reason,
      description,
      evidence
    );

    return { success: true, dispute };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create dispute",
    };
  }
}

/**
 * API Endpoint: Get dispute status
 * GET /api/transactions/{transactionId}/dispute
 */
export async function getDisputeEndpoint(transactionId: string): Promise<Dispute | null> {
  const disputeManager = new DisputeManager();
  return await disputeManager.getDispute(transactionId);
}

/**
 * API Endpoint: Admin review
 * POST /api/admin/disputes/{transactionId}/review
 * Body: { resolution, adminNotes }
 */
export async function adminReviewDisputeEndpoint(
  transactionId: string,
  adminId: string,
  resolution: "refund" | "partial_refund" | "dismiss",
  adminNotes: string
): Promise<{ success: boolean; dispute?: Dispute; error?: string }> {
  try {
    const disputeManager = new DisputeManager();
    const dispute = await disputeManager.reviewDispute(
      transactionId,
      adminId,
      resolution,
      adminNotes
    );

    return { success: true, dispute };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review dispute",
    };
  }
}

// ============================================================================
// DATABASE MIGRATIONS
// ============================================================================

export const DISPUTE_MIGRATIONS = `
-- Create escrow table
CREATE TABLE IF NOT EXISTS escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id),
  buyer_id UUID NOT NULL REFERENCES loops(id),
  seller_id UUID NOT NULL REFERENCES loops(id),
  amount_cents BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'held',
  held_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  refunded_at TIMESTAMP,
  dispute_id UUID
);

CREATE INDEX idx_escrow_status ON escrow(status);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id),
  buyer_id UUID NOT NULL REFERENCES loops(id),
  seller_id UUID NOT NULL REFERENCES loops(id),
  reason VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolution VARCHAR(20),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(50)
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);
`;
