/**
 * POST /api/admin/verifications/{applicationId}/approve
 * Admin approves agent verification
 * Body: { approve: boolean, notes }
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("admin-verification");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;

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
    const { approve, notes } = body;

    if (typeof approve !== "boolean") {
      return NextResponse.json(
        { error: "approve must be boolean" },
        { status: 400 }
      );
    }

    // Get application
    const appRes = await query<{
      id: string;
      loop_id: string;
      skill: string;
      evidence: string;
      status: string;
    }>(
      `SELECT id, loop_id, skill, evidence, status FROM verification_applications WHERE id = $1`,
      [applicationId]
    );

    if (!appRes.rows[0]) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const app = appRes.rows[0];

    if (app.status !== "pending") {
      return NextResponse.json(
        { error: `Application already ${app.status}` },
        { status: 400 }
      );
    }

    if (approve) {
      // PHASE 3: APPROVE - Create verification record
      const verRes = await query<{ id: string }>(
        `INSERT INTO agent_verifications (loop_id, skill, verified_at, verified_by, evidence)
         VALUES ($1, $2, NOW(), 'admin', $3)
         RETURNING id`,
        [app.loop_id, app.skill, app.evidence]
      );

      // Update application status
      await query(
        `UPDATE verification_applications SET status = 'approved', reviewed_at = NOW(), reviewed_by = 'admin'
         WHERE id = $1`,
        [applicationId]
      );

      // PHASE 3: AUTO-AWARD BADGES
      // Award "verified" badge
      await query(
        `INSERT INTO agent_badges (loop_id, badge_type, level, earned_at)
         VALUES ($1, 'verified', 1, NOW())
         ON CONFLICT (loop_id, badge_type) DO UPDATE SET level = agent_badges.level + 1`,
        [app.loop_id]
      ).catch(() => {}); // Ignore if badge already exists

      logger.info("Verification approved", {
        application_id: applicationId,
        skill: app.skill,
      });

      return NextResponse.json({
        success: true,
        applicationId,
        status: "approved",
        skill: app.skill,
        message: "Verification approved",
      });
    } else {
      // PHASE 3: REJECT
      await query(
        `UPDATE verification_applications SET status = 'rejected', reviewed_at = NOW(), reviewed_by = 'admin'
         WHERE id = $1`,
        [applicationId]
      );

      logger.info("Verification rejected", {
        application_id: applicationId,
        notes,
      });

      return NextResponse.json({
        success: true,
        applicationId,
        status: "rejected",
        message: "Verification application rejected",
      });
    }
  } catch (error) {
    logger.error("Admin verification failed", error);
    return NextResponse.json(
      { error: "Failed to process verification" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/verifications/pending
 * Get all pending verification applications
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

    // Get pending applications with agent info
    const appRes = await query<{
      id: string;
      loop_id: string;
      loop_tag: string;
      skill: string;
      evidence: string;
      applied_at: string;
    }>(
      `SELECT va.id, va.loop_id, l.loop_tag, va.skill, va.evidence, va.applied_at
       FROM verification_applications va
       LEFT JOIN loops l ON va.loop_id = l.id
       WHERE va.status = 'pending'
       ORDER BY va.applied_at ASC`,
      []
    );

    return NextResponse.json({
      applications: appRes.rows,
      total: appRes.rows.length,
    });
  } catch (error) {
    logger.error("Get pending verifications failed", error);
    return NextResponse.json(
      { error: "Failed to get applications" },
      { status: 500 }
    );
  }
}
