import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { executeBrowserAction } from "@/lib/browser-execution";

/**
 * GET  /api/browser/orders         - list orders (pending + history)
 * POST /api/browser/orders         - create a new order request
 * PUT  /api/browser/orders?id=xxx  - approve or reject a pending order
 */

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const statusFilter = status ? `AND status = '${status.replace(/'/g, "")}'` : "";

  const orders = await query<{
    id: string; order_type: string; target_business: string; description: string;
    amount_cents: number; status: string; approval_message: string;
    confirmation_id: string; actual_amount_cents: number; savings_cents: number;
    created_at: string; approved_at: string;
  }>(
    `SELECT id, order_type, target_business, description, amount_cents, status,
            approval_message, confirmation_id, actual_amount_cents, savings_cents,
            created_at, approved_at
     FROM loop_agent_orders WHERE loop_id = $1 ${statusFilter}
     ORDER BY created_at DESC LIMIT 30`,
    [session.loopId]
  ).catch(() => ({ rows: [] }));

  const pendingCount = orders.rows.filter(o => o.status === "pending_approval").length;

  return NextResponse.json({ orders: orders.rows, pendingCount });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = req.nextUrl.searchParams.get("id");
  const { action } = await req.json().catch(() => ({})); // "approve" | "reject"

  if (!orderId) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });

  // Verify order belongs to this Loop
  const orderRes = await query<{
    id: string; target_business: string; target_url: string;
    description: string; amount_cents: number;
  }>(
    "SELECT id, target_business, target_url, description, amount_cents FROM loop_agent_orders WHERE id = $1 AND loop_id = $2 AND status = 'pending_approval'",
    [orderId, session.loopId]
  );
  const order = orderRes.rows[0];
  if (!order) return NextResponse.json({ error: "Order not found or not pending" }, { status: 404 });

  if (action === "reject") {
    await query(
      "UPDATE loop_agent_orders SET status = 'cancelled', approved_by = 'human', approved_at = now() WHERE id = $1",
      [orderId]
    );
    // Notify Loop
    const loopRes = await query<{ loop_tag: string }>("SELECT loop_tag FROM loops WHERE id = $1", [session.loopId]);
    await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)",
      [session.loopId, `❌ Order cancelled: ${order.description}. Understood — I won't proceed.`]
    ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  // Approve — update and execute
  await query(
    "UPDATE loop_agent_orders SET status = 'executing', approved_by = 'human', approved_at = now() WHERE id = $1",
    [orderId]
  );

  const loopRes = await query<{ loop_tag: string; skill_tier: number }>(
    "SELECT loop_tag, skill_tier FROM loops WHERE id = $1", [session.loopId]
  );
  const loop = loopRes.rows[0];
  try {
    const { fireOrderApproved } = await import("@/lib/n8n-integration");
    fireOrderApproved(session.loopId, loop?.loop_tag ?? "Loop", {
      orderId,
      orderType: "purchase",
      description: order.description,
    });
  } catch (_) {}

  // Notify Loop
  await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)",
    [session.loopId, `✅ Approved! Executing: ${order.description}…`]
  ).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

  // Execute browser action
  const url = order.target_url || `https://www.${order.target_business.toLowerCase().replace(/\s+/g, "")}.com`;
  const result = await executeBrowserAction({
    loopId: session.loopId,
    loopTag: loop?.loop_tag || "Loop",
    objective: order.description,
    targetUrl: url,
    targetBusiness: order.target_business,
    sessionType: "order",
  });

  // Update order
  await query(
    "UPDATE loop_agent_orders SET status = $1, actual_amount_cents = $2, savings_cents = $3, confirmation_id = $4, updated_at = now() WHERE id = $5",
    [result.success ? "completed" : "failed", order.amount_cents, result.savingsCents || 0, result.confirmationId || null, orderId]
  );

  // Fire n8n webhook
  const { fireOrderPlaced } = await import("@/lib/n8n-integration");
  fireOrderPlaced(session.loopId, loop?.loop_tag || "Loop", {
    orderId,
    orderType: "purchase",
    targetBusiness: order.target_business,
    description: order.description,
    amountCents: order.amount_cents,
  }).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });

  return NextResponse.json({ ok: true, status: result.success ? "completed" : "failed", result });
}
