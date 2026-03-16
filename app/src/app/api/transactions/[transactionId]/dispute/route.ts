/**
 * POST /api/transactions/{transactionId}/dispute
 * File a dispute for a transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("dispute-api");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  try {
    // PHASE 1: VALIDATE INPUT
    const body = await req.json();
    const { reason, description, evidence } = body;

    if (!reason || !description) {
      return NextResponse.json(
        { error: "reason and description required" },
        { status: 400 }
      );
    }

    // Get transaction details
    const txnRes = await query<{
      buyer_loop_id: string;
      seller_id: string;
      amount_cents: number;
    }>(
      `SELECT buyer_loop_id, seller_id, amount_cents FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (!txnRes.rows[0]) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const txn = txnRes.rows[0];

    // PHASE 3: CREATE DISPUTE
    const disputeRes = await query<{ id: string }>(
      `INSERT INTO disputes (transaction_id, buyer_id, seller_id, reason, description, evidence, created_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'open')
       RETURNING id`,
      [transactionId, txn.buyer_loop_id, txn.seller_id, reason, description, evidence || null]
    );

    // PHASE 3: UPDATE ESCROW STATUS
    await query(
      `UPDATE escrow SET status = 'disputed' WHERE transaction_id = $1`,
      [transactionId]
    );

    // PHASE 1: ERROR TRACKING
    logger.info("Dispute created", {
      dispute_id: disputeRes.rows[0]?.id,
      transaction_id: transactionId,
      reason,
    });

    return NextResponse.json({
      success: true,
      disputeId: disputeRes.rows[0]?.id,
      transactionId,
      status: "open",
    });
  } catch (error) {
    logger.error("Create dispute failed", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions/{transactionId}/dispute
 * Get dispute status
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  try {
    const disputeRes = await query<{
      id: string;
      reason: string;
      description: string;
      created_at: string;
      status: string;
      resolution: string | null;
    }>(
      `SELECT id, reason, description, created_at, status, resolution 
       FROM disputes WHERE transaction_id = $1`,
      [transactionId]
    );

    if (!disputeRes.rows[0]) {
      return NextResponse.json({ dispute: null, exists: false });
    }

    const dispute = disputeRes.rows[0];

    return NextResponse.json({
      dispute,
      exists: true,
      status: dispute.status,
    });
  } catch (error) {
    logger.error("Get dispute failed", error);
    return NextResponse.json(
      { error: "Failed to get dispute" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/disputes/{transactionId}/review
 * Admin review and resolve dispute
 */

export async function adminReviewDispute(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;

  try {
    const body = await req.json();
    const { resolution, adminNotes, adminId } = body;

    if (!resolution || !adminId) {
      return NextResponse.json(
        { error: "resolution and adminId required" },
        { status: 400 }
      );
    }

    // PHASE 3: UPDATE DISPUTE
    await query(
      `UPDATE disputes SET status = 'resolved', resolution = $1, admin_notes = $2, resolved_by = $3, resolved_at = NOW()
       WHERE transaction_id = $4`,
      [resolution, adminNotes || null, adminId, transactionId]
    );

    // PHASE 3: EXECUTE RESOLUTION (update escrow)
    const txnRes = await query<{ amount_cents: number; buyer_loop_id: string; seller_id: string }>(
      `SELECT amount_cents, buyer_loop_id, seller_id FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (txnRes.rows[0]) {
      const txn = txnRes.rows[0];

      if (resolution === "refund") {
        // Full refund to buyer
        await query(
          `UPDATE escrow SET status = 'refunded' WHERE transaction_id = $1`,
          [transactionId]
        );
        // Insert wallet event
        await query(
          `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
           VALUES ($1, $2, 'dispute_refund', $3)`,
          [txn.buyer_loop_id, transactionId, txn.amount_cents]
        );
      } else if (resolution === "partial_refund") {
        // 50/50 split
        const half = Math.floor(txn.amount_cents / 2);
        await query(
          `UPDATE escrow SET status = 'released' WHERE transaction_id = $1`,
          [transactionId]
        );
        await query(
          `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
           VALUES ($1, $2, 'dispute_partial_refund_buyer', $3),
                  ($4, $2, 'dispute_partial_refund_seller', $5)`,
          [txn.buyer_loop_id, transactionId, half, txn.seller_id, half]
        );
      } else {
        // Dismiss - release to seller
        await query(
          `UPDATE escrow SET status = 'released' WHERE transaction_id = $1`,
          [transactionId]
        );
        await query(
          `INSERT INTO loop_wallet_events (loop_id, transaction_id, kind, net_cents)
           VALUES ($1, $2, 'escrow_release', $3)`,
          [txn.seller_id, transactionId, txn.amount_cents]
        );
      }
    }

    logger.info("Dispute resolved", { transaction_id: transactionId, resolution });

    return NextResponse.json({
      success: true,
      transactionId,
      resolution,
    });
  } catch (error) {
    logger.error("Admin review dispute failed", error);
    return NextResponse.json(
      { error: "Failed to review dispute" },
      { status: 500 }
    );
  }
}
