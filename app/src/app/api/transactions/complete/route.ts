import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { recordDeal } from "@/lib/transactions";

// POST /api/transactions/complete — Record a completed deal (sandbox or real). Body: { sellerLoopId, amountCents, kind }
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sellerLoopId?: string; amountCents?: number; kind?: "sandbox" | "real" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sellerLoopId = typeof body.sellerLoopId === "string" ? body.sellerLoopId.trim() : null;
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : null;
  const kind = body.kind === "sandbox" || body.kind === "real" ? body.kind : "sandbox";

  if (!sellerLoopId || amountCents === null || amountCents < 0) {
    return NextResponse.json(
      { error: "sellerLoopId and amountCents (non-negative) required" },
      { status: 400 }
    );
  }

  if (sellerLoopId === session.loopId) {
    return NextResponse.json({ error: "Cannot deal with yourself" }, { status: 400 });
  }

  const { query } = await import("@/lib/db");
  const sellerCheck = await query<{ id: string }>(
    `SELECT id FROM loops WHERE id = $1 AND status = 'active'`,
    [sellerLoopId]
  );
  if (sellerCheck.rows.length === 0) {
    return NextResponse.json({ error: "Seller Loop not found or not active" }, { status: 404 });
  }

  const { transactionId } = await recordDeal({
    buyerLoopId: session.loopId,
    sellerLoopId,
    amountCents,
    kind,
  });

  return NextResponse.json({ success: true, transactionId });
}
