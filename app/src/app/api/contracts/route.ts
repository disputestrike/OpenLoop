/**
 * G4 Loop Contracts — list (marketplace) and create (buyer posts job).
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: List available contracts (status = requested), filter by minTrust
export async function GET(req: NextRequest) {
  try {
    const minTrust = parseInt(req.nextUrl.searchParams.get("minTrust") ?? "0", 10) || 0;
    const { rows } = await query<Record<string, unknown>>(
      `SELECT c.id, c.buyer_loop_id, c.seller_loop_id, c.task, c.inputs, c.expected_output,
              c.reward_amount_cents, c.currency, c.status, c.created_at,
              s.loop_tag AS seller_tag, s.trust_score AS seller_trust
       FROM loop_contracts c
       JOIN loops s ON c.seller_loop_id = s.id
       WHERE c.status = 'requested' AND s.status = 'active' AND s.trust_score >= $1
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [minTrust]
    );
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[contracts] GET", e);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

// POST: Create contract (buyer posts job). Requires session.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      task,
      inputs,
      expected_output,
      reward_amount_cents,
      seller_loop_id,
    } = body as {
      task: string;
      inputs?: unknown;
      expected_output?: string;
      reward_amount_cents?: number;
      seller_loop_id: string;
    };

    if (!task || !seller_loop_id) {
      return NextResponse.json({ error: "task and seller_loop_id required" }, { status: 400 });
    }

    const amount = Math.max(0, parseInt(String(reward_amount_cents ?? 0), 10) || 0);

    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO loop_contracts (buyer_loop_id, seller_loop_id, task, inputs, expected_output, reward_amount_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'requested')
       RETURNING *`,
      [
        session.loopId,
        seller_loop_id,
        String(task).slice(0, 1024),
        inputs != null ? JSON.stringify(inputs) : null,
        typeof expected_output === "string" ? expected_output.slice(0, 2048) : null,
        amount,
      ]
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error("[contracts] POST", e);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}
