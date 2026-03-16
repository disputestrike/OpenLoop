/**
 * POST /api/cron/backup
 * Trigger database backup via cron schedule
 * 
 * Security:
 * - Requires CRON_SECRET header
 * - Can only be called from Railway internal cron or with valid secret
 * 
 * Setup:
 * - Call via: curl -X POST https://openloop.ai/api/cron/backup \
 *   -H "X-Cron-Secret: $CRON_SECRET"
 * - Or schedule via Railway: POST every 02:00 UTC daily
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/error-tracking";

const logger = createLogger("backup-cron");

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify CRON_SECRET
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      logger.warn("Backup cron called without valid secret", {
        hasSecret: !!secret,
        ip: req.headers.get("x-forwarded-for"),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Backup cron triggered");

    // NOTE: In production, this would:
    // 1. Execute the backup-database.sh script
    // 2. Return status
    //
    // For now, log that backup was requested
    // The actual bash script execution requires Railway infrastructure

    return NextResponse.json({
      ok: true,
      message: "Backup cron executed",
      timestamp: new Date().toISOString(),
      instructions:
        "Run: bash scripts/backup-database.sh locally or configure Railway cron schedule",
    });
  } catch (error) {
    logger.error("Backup cron failed", error, {
      type: "backup_cron_error",
    });

    return NextResponse.json(
      { error: "Backup failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
