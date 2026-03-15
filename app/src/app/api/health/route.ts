import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { redisPing } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbOk = await checkDb();
  const redisOk = process.env.REDIS_URL ? await redisPing() : true;

  if (!dbOk) {
    return NextResponse.json(
      { ok: false, db: false, redis: redisOk },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    db: true,
    redis: !!process.env.REDIS_URL && redisOk,
    buildId: "38fe0ae-telegram-memory-inscope-replies",
  });
}

async function checkDb(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
