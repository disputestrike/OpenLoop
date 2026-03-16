/**
 * POST /api/agents/{loopTag}/verification/apply
 * Agent applies for skill verification
 * Body: { skill, evidence }
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createLogger } from "@/lib/error-tracking";
import { getSessionFromRequest } from "@/lib/auth";

const logger = createLogger("verification-apply");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ loopTag: string }> }
) {
  const { loopTag } = await params;

  try {
    // Get current user session
    const session = await getSessionFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns this agent
    const userAgentRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE id = $1 AND loop_tag = $2`,
      [session.loopId, loopTag]
    );

    if (!userAgentRes.rows[0]) {
      return NextResponse.json(
        { error: "You don't own this agent" },
        { status: 403 }
      );
    }

    const loopId = userAgentRes.rows[0].id;

    // PHASE 1: INPUT VALIDATION
    const body = await req.json();
    const { skill, evidence } = body;

    const validSkills = ["finance", "travel", "health", "legal"];
    if (!skill || !validSkills.includes(skill)) {
      return NextResponse.json(
        { error: "skill must be: finance, travel, health, or legal" },
        { status: 400 }
      );
    }

    if (!evidence || typeof evidence !== "string" || evidence.length < 10) {
      return NextResponse.json(
        { error: "evidence required (min 10 characters)" },
        { status: 400 }
      );
    }

    // Check if already verified for this skill
    const existingRes = await query<{ id: string }>(
      `SELECT id FROM agent_verifications WHERE loop_id = $1 AND skill = $2`,
      [loopId, skill]
    );

    if (existingRes.rows[0]) {
      return NextResponse.json(
        { error: "Already verified for this skill" },
        { status: 400 }
      );
    }

    // Check if already applied
    const appliedRes = await query<{ id: string }>(
      `SELECT id FROM verification_applications WHERE loop_id = $1 AND skill = $2 AND status = 'pending'`,
      [loopId, skill]
    );

    if (appliedRes.rows[0]) {
      return NextResponse.json(
        { error: "Already applied for verification, pending admin review" },
        { status: 400 }
      );
    }

    // Create verification application
    const appRes = await query<{ id: string }>(
      `INSERT INTO verification_applications (loop_id, skill, evidence, applied_at, status)
       VALUES ($1, $2, $3, NOW(), 'pending')
       RETURNING id`,
      [loopId, skill, evidence.slice(0, 2000)]
    );

    logger.info("Verification application created", {
      application_id: appRes.rows[0]?.id,
      loop_id: loopId,
      skill,
    });

    return NextResponse.json({
      success: true,
      applicationId: appRes.rows[0]?.id,
      skill,
      status: "pending",
      message: "Application submitted. Admin will review within 24 hours.",
    });
  } catch (error) {
    logger.error("Verification apply failed", error);
    return NextResponse.json(
      { error: "Failed to submit verification application" },
      { status: 500 }
    );
  }
}
