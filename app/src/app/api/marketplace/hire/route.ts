import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";
const HIRE_COST_CENTS = 100; // $1.00 per hire (sandbox credits)

function getCerebrasKey(): string {
  return process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY_2 || "";
}

/**
 * POST /api/marketplace/hire
 * Body: { agentLoopId, agentLoopTag, taskDescription }
 * 
 * Flow:
 * 1. Check buyer has enough credits
 * 2. Deduct credits from buyer wallet
 * 3. Credit seller wallet (70/30 split — 70% to agent owner, 30% platform)
 * 4. Create order record
 * 5. Agent "executes" task via Cerebras
 * 6. Return result
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agentLoopId, agentLoopTag, taskDescription } = body;

    if (!agentLoopTag || !taskDescription) {
      return NextResponse.json({ error: "agentLoopTag and taskDescription required" }, { status: 400 });
    }

    // Can't hire yourself
    const selfCheck = await query<{ id: string }>(
      `SELECT id FROM loops WHERE loop_tag = $1 AND id = $2`,
      [agentLoopTag, session.loopId]
    ).catch(() => ({ rows: [] as any[] }));
    if (selfCheck.rows[0]) {
      return NextResponse.json({ error: "You can't hire your own Loop" }, { status: 400 });
    }

    // Check buyer wallet balance
    const balanceRes = await query<{ balance: string }>(
      `SELECT COALESCE(SUM(net_cents), 0)::text as balance FROM loop_wallet_events WHERE loop_id = $1`,
      [session.loopId]
    ).catch(() => ({ rows: [{ balance: "0" }] }));
    const balance = parseInt(balanceRes.rows[0]?.balance || "0");

    if (balance < HIRE_COST_CENTS) {
      return NextResponse.json({
        error: `Insufficient credits. You have $${(balance / 100).toFixed(2)} but hiring costs $${(HIRE_COST_CENTS / 100).toFixed(2)}.`,
        balance,
        cost: HIRE_COST_CENTS,
      }, { status: 400 });
    }

    // Find the agent
    const agentRes = await query<{ id: string; loop_tag: string; trust_score: number }>(
      `SELECT id, loop_tag, trust_score FROM loops WHERE loop_tag = $1`,
      [agentLoopTag]
    ).catch(() => ({ rows: [] as any[] }));
    if (!agentRes.rows[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const agent = agentRes.rows[0];

    // Deduct from buyer wallet
    await query(
      `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
       VALUES ($1, 'hire_payment', $2, 0, $3, $4, 'sandbox')`,
      [session.loopId, -HIRE_COST_CENTS, -HIRE_COST_CENTS, `Hired @${agentLoopTag}: ${taskDescription.slice(0, 80)}`]
    );

    // Credit seller wallet (70% to agent, 30% platform fee)
    const agentEarnings = Math.floor(HIRE_COST_CENTS * 0.7);
    const platformFee = HIRE_COST_CENTS - agentEarnings;
    await query(
      `INSERT INTO loop_wallet_events (loop_id, event_type, amount_cents, platform_fee_cents, net_cents, description, verification_tier)
       VALUES ($1, 'hire_earnings', $2, $3, $4, $5, 'sandbox')`,
      [agent.id, HIRE_COST_CENTS, platformFee, agentEarnings, `Earned from hire: ${taskDescription.slice(0, 80)}`]
    ).catch(() => {});

    // Create order
    const orderRes = await query<{ id: string }>(
      `INSERT INTO loop_agent_orders (loop_id, order_type, target_business, description, estimated_cost_cents, status, result_summary)
       VALUES ($1, 'marketplace_hire', $2, $3, $4, 'executing', 'Agent working on task...')
       RETURNING id`,
      [session.loopId, agentLoopTag, taskDescription.slice(0, 500), HIRE_COST_CENTS]
    ).catch(() => ({ rows: [] as any[] }));
    const orderId = orderRes.rows[0]?.id;

    // Agent executes the task via Cerebras
    const key = getCerebrasKey();
    let result = `@${agentLoopTag} is working on your task. Results will be delivered shortly.`;

    if (key) {
      const res = await fetch(CEREBRAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `You are @${agentLoopTag}, a specialized AI agent hired to complete a task on OpenLoop. You are being paid for this work. Deliver a thorough, specific, actionable result. Include real numbers, specific steps, and concrete recommendations. Format clearly. Do NOT say you can't do something — provide the best possible deliverable.`,
            },
            {
              role: "user",
              content: `HIRED TASK: ${taskDescription}\n\nDeliver a complete result. Be specific, thorough, and actionable.`,
            },
          ],
          max_tokens: 800,
          temperature: 0.6,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        result = data.choices?.[0]?.message?.content?.trim() || result;
      }
    }

    // Update order with result
    if (orderId) {
      await query(
        `UPDATE loop_agent_orders SET status = 'completed', result_summary = $1, executed_at = NOW() WHERE id = $2`,
        [result.slice(0, 4000), orderId]
      ).catch(() => {});
    }

    // Create activity post
    await query(
      `INSERT INTO activities (source_type, loop_id, kind, title, domain)
       VALUES ('marketplace', $1, 'deal', $2, 'business')`,
      [agent.id, `@${agentLoopTag} completed hired task: ${taskDescription.slice(0, 100)}`]
    ).catch(() => {});

    // Create transaction
    await query(
      `INSERT INTO transactions (buyer_loop_id, seller_loop_id, amount_cents, kind, status)
       VALUES ($1, $2, $3, 'sandbox', 'completed')`,
      [session.loopId, agent.id, HIRE_COST_CENTS]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      orderId,
      result,
      cost: HIRE_COST_CENTS,
      agentEarnings,
      platformFee,
      newBalance: balance - HIRE_COST_CENTS,
    });
  } catch (error) {
    console.error("[marketplace/hire]", error);
    return NextResponse.json({ error: "Hire failed" }, { status: 500 });
  }
}
