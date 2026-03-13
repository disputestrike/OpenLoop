import { NextResponse } from "next/server";

// POST /api/logout — Clear session cookie
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
