/**
 * GET /api/network/stats
 *
 * Network health and protocol dashboard metrics. Used by admin Network tab and for
 * investor demos / proving network growth. Covers the entire agent economy.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const dynamic = "force-dynamic";

// Contract statuses that count as "active" (requested, accepted, working, delivered)
const ACTIVE_STATUSES = ["requested", "accepted", "working", "delivered"];

export async function GET() {
  try {
    const activeList = ACTIVE_STATUSES.map((s) => `'${s}'`).join(",");

    const [
      agentsRegistered,
      tasksCreated,
      offersSent,
      contractsActive,
      contractsCompleted,
      paymentsProcessed,
      eventsByType,
    ] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM loops WHERE status = 'active' AND (COALESCE(array_length(agent_core_domains, 1), 0) > 0 OR (webhook_url IS NOT NULL AND webhook_url != ''))`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM protocol_task_events WHERE event_type = 'TASK_REQUEST'`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM protocol_task_events WHERE event_type = 'TASK_OFFER'`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM loop_contracts WHERE status IN (${activeList})`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM loop_contracts WHERE status IN ('completed', 'verified')`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM protocol_task_events WHERE event_type = 'PAYMENT_CONFIRM'`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ event_type: string; count: string }>(
        `SELECT event_type, COUNT(*)::text as count FROM protocol_task_events GROUP BY event_type`
      ).catch(() => ({ rows: [] })),
    ]);

    const txVolume = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount_cents), 0)::text as sum FROM transactions WHERE status = 'completed'`
    ).catch(() => ({ rows: [{ sum: "0" }] }));

    const eventsByTypeMap: Record<string, number> = {};
    eventsByType.rows.forEach((r) => {
      eventsByTypeMap[r.event_type] = parseInt(r.count || "0", 10);
    });

    return NextResponse.json({
      agentsRegistered: parseInt(agentsRegistered.rows[0]?.count || "0", 10),
      tasksCreated: parseInt(tasksCreated.rows[0]?.count || "0", 10),
      offersSent: parseInt(offersSent.rows[0]?.count || "0", 10),
      contractsActive: parseInt(contractsActive.rows[0]?.count || "0", 10),
      contractsCompleted: parseInt(contractsCompleted.rows[0]?.count || "0", 10),
      paymentsProcessed: parseInt(paymentsProcessed.rows[0]?.count || "0", 10),
      transactionVolumeCents: parseInt(txVolume.rows[0]?.sum || "0", 10),
      eventsByType: eventsByTypeMap,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[network/stats]", e);
    return NextResponse.json({
      agentsRegistered: 0,
      tasksCreated: 0,
      offersSent: 0,
      contractsActive: 0,
      contractsCompleted: 0,
      paymentsProcessed: 0,
      transactionVolumeCents: 0,
      eventsByType: {},
    });
  }
}
