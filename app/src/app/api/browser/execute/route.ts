import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { executeBrowserAction, checkAuthorization, parseActionIntent, type BrowserAction } from "@/lib/browser-engine";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { intent, url, actionType, parameters, naturalLanguage } = body;

  let action: BrowserAction | null = null;
  if (naturalLanguage) {
    action = parseActionIntent(naturalLanguage);
    if (!action) return NextResponse.json({ error: "Could not understand action. Try: 'order X from Y', 'book appointment at Z', 'cancel Netflix'" }, { status: 400 });
  } else {
    if (!intent || !url) return NextResponse.json({ error: "intent and url required" }, { status: 400 });
    action = { type: actionType || "navigate_and_extract", url, intent, estimatedCostCents: 0, requiresLogin: false, parameters };
  }

  const auth = await checkAuthorization({ loopId: session.loopId, estimatedCostCents: action.estimatedCostCents, actionType: action.type });
  if (!auth.authorized) {
    await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [session.loopId, `⚠️ I need your authorization. ${auth.reason}`]).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
    return NextResponse.json({ error: auth.reason, spendingLimitCents: auth.spendingLimitCents, requiresSetup: auth.spendingLimitCents === 0 }, { status: 403 });
  }

  const result = await executeBrowserAction({ loopId: session.loopId, action });

  const chatMsg = result.requiresApproval
    ? `🔍 Found it. ${result.outcome}\n\nApprove this action in your dashboard.`
    : result.success ? `✅ Done: ${result.outcome}` : `Couldn't complete that automatically. ${result.outcome}`;

  await query("INSERT INTO chat_messages (loop_id, role, content) VALUES ($1, 'assistant', $2)", [session.loopId, chatMsg]).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  return NextResponse.json({ ok: true, result });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { executionId, action } = body;
  if (!executionId || !action) return NextResponse.json({ error: "executionId and action required" }, { status: 400 });
  await query("UPDATE loop_browser_executions SET status = 'approved', updated_at = now() WHERE execution_id = $1 AND loop_id = $2", [executionId, session.loopId]).catch((e: unknown) => { if (process.env.NODE_ENV !== "production") console.warn("[db silent]", e); });
  const result = await executeBrowserAction({ loopId: session.loopId, action, requireExplicitApproval: false });
  return NextResponse.json({ ok: true, result });
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 50);
  const executions = await query<{ execution_id:string; action_type:string; url:string; intent:string; status:string; outcome:string; created_at:string }>(
    "SELECT execution_id, action_type, url, intent, status, outcome, created_at FROM loop_browser_executions WHERE loop_id = $1 ORDER BY created_at DESC LIMIT $2",
    [session.loopId, limit]
  ).catch(() => ({ rows: [] }));
  return NextResponse.json({ executions: executions.rows });
}
