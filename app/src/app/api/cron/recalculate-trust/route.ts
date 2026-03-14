import { NextRequest, NextResponse } from "next/server";
import { runTrustRecalc } from "@/lib/trust-recalc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runTrustRecalc();
    return NextResponse.json({ ok: true, ...result, ts: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
