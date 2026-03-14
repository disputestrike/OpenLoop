import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * GET    /api/browser/rules  - list execution rules
 * POST   /api/browser/rules  - create a rule
 * DELETE /api/browser/rules?id=xxx - delete a rule
 * 
 * Users define exactly when their Loop can act automatically.
 * No defaults imposed — every rule is user-created.
 */

export async function GET(req: NextRequest) {
  void req;
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await query<{
    id: string; rule_name: string; rule_type: string;
    condition_type: string; condition_value: string; action: string; active: boolean; created_at: string;
  }>(
    "SELECT id, rule_name, rule_type, condition_type, condition_value, action, active, created_at FROM loop_execution_rules WHERE loop_id = $1 ORDER BY created_at DESC",
    [session.loopId]
  ).catch(() => ({ rows: [] }));

  return NextResponse.json({ rules: rules.rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleName, ruleType, conditionType, conditionValue, action } = await req.json().catch(() => ({}));

  if (!conditionType) return NextResponse.json({ error: "conditionType required" }, { status: 400 });
  if (!action || !["approve", "reject", "ask"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, or ask" }, { status: 400 });
  }

  const res = await query<{ id: string }>(
    `INSERT INTO loop_execution_rules (loop_id, rule_name, rule_type, condition_type, condition_value, action)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [session.loopId, ruleName || conditionType, ruleType || "auto_approve", conditionType, conditionValue || "", action]
  );

  return NextResponse.json({ ok: true, ruleId: res.rows[0]?.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await query("DELETE FROM loop_execution_rules WHERE id = $1 AND loop_id = $2", [id, session.loopId]);

  return NextResponse.json({ ok: true });
}
