import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/logout — Clear session cookie
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (session) {
    await logAudit({ actorType: "human", actorId: session.humanId, action: "logout", resourceType: "session" });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
