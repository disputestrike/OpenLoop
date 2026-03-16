import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("admin-disputes");

/**
 * GET /api/admin/disputes
 * Get all open disputes for admin review
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get open disputes
    const disputesRes = await query<{
      id: string;
      transaction_id: string;
      buyer_id: string;
      seller_id: string;
      reason: string;
      description: string;
      created_at: string;
      status: string;
    }>(
      `SELECT id, transaction_id, buyer_id, seller_id, reason, description, created_at, status
       FROM disputes
       WHERE status = 'open'
       ORDER BY created_at ASC`,
      []
    );

    return NextResponse.json({
      disputes: disputesRes.rows,
      total: disputesRes.rows.length,
    });
  } catch (error) {
    logger.error("Get disputes failed", error);
    return NextResponse.json(
      { error: "Failed to get disputes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/disputes/{id}/review
 * Admin reviews and resolves dispute
 * Body: { resolution: "refund" | "partial_refund" | "dismiss", adminNotes }
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // PHASE 1: INPUT VALIDATION
    const body = await req.json();
    const { transactionId, resolution, adminNotes } = body;

    if (!transactionId || !resolution) {
      return NextResponse.json(
        { error: "transactionId and resolution required" },
        { status: 400 }
      );
    }

    if (!["refund", "partial_refund", "dismiss"].includes(resolution)) {
      return NextResponse.json(
        { error: "resolution must be refund, partial_refund, or dismiss" },
        { status: 400 }
      );
    }

    // Get dispute details
    const disputeRes = await query<{
      id: string;
      buyer_id: string;
      seller_id: string;
    }>(
      `SELECT id, buyer_id, seller_id FROM disputes WHERE transaction_id = $1`,
      [transactionId]
    );

    if (!disputeRes.rows[0]) {
      return NextResponse.json(
        { error: "Dispute not found" },
        { status: 404 }
      );
    }

    const dispute = disputeRes.rows[0];

    // Get transaction details
    const txnRes = await query<{
      amount_cents: number;
    }>(
      `SELECT amount_cents FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (!txnRes.rows[0]) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const txn = txnRes.rows[0];

    // PHASE 3: UPDATE DISPUTE
    await query(
      `UPDATE disputes SET status = 'resolved', resolution = $1, admin_notes = $2, resolved_by = 'admin', resolved_at = NOW()
       WHERE id = $3`,
      [resolution, adminNotes || null, dispute.id]
    );

    // PHASE 3: EXECUTE RESOLUTION
    if (resolution === "refund") {
      // Full refund to buyer
      await query(
        `UPDATE escrow SET status = 'refunded' WHERE transaction_id = $1`,
        [transactionId]
      );

      // Credit buyer wallet
      await query(
        `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
         VALUES ($1, $2, 'dispute_refund', $3)`,
        [dispute.buyer_id, transactionId, txn.amount_cents]
      );
    } else if (resolution === "partial_refund") {
      // 50/50 split
      const half = Math.floor(txn.amount_cents / 2);

      await query(
        `UPDATE escrow SET status = 'released' WHERE transaction_id = $1`,
        [transactionId]
      );

      // Split between buyer and seller
      await query(
        `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
         VALUES ($1, $2, 'dispute_partial_refund_buyer', $3),
                ($4, $2, 'dispute_partial_refund_seller', $5)`,
        [dispute.buyer_id, transactionId, half, dispute.seller_id, half]
      );
    } else {
      // Dismiss - release to seller
      await query(
        `UPDATE escrow SET status = 'released' WHERE transaction_id = $1`,
        [transactionId]
      );

      // Credit seller wallet
      await query(
        `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
         VALUES ($1, $2, 'escrow_release', $3)`,
        [dispute.seller_id, transactionId, txn.amount_cents]
      );
    }

    logger.info("Dispute resolved", {
      transaction_id: transactionId,
      resolution,
    });

    return NextResponse.json({
      success: true,
      transactionId,
      resolution,
    });
  } catch (error) {
    logger.error("Review dispute failed", error);
    return NextResponse.json(
      { error: "Failed to review dispute" },
      { status: 500 }
    );
  }
}

