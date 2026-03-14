import { NextRequest, NextResponse } from "next/server";
import { claimLoop, setSessionCookie } from "@/lib/claim-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/claim-loop
 * 
 * User claims a loop and gets session token
 * 
 * Body:
 * {
 *   loopId?: string,  // ID of existing loop (optional)
 *   loopTag?: string, // Tag of existing loop (optional)
 *   // If neither provided: creates new loop
 * }
 * 
 * Returns:
 * {
 *   success: true,
 *   loopId: "uuid",
 *   loopTag: "optional-tag",
 *   redirect: "/dashboard"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const loopId = body.loopId || body.loopTag;

    // Claim loop (creates session in DB)
    const session = await claimLoop(loopId || "");

    if (!session) {
      return NextResponse.json(
        { error: "Failed to claim loop" },
        { status: 500 }
      );
    }

    // Set session cookie
    await setSessionCookie(session.token);

    // Return success with redirect
    return NextResponse.json({
      success: true,
      loopId: session.loopId,
      humanId: session.humanId,
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("[claim-loop]", error);
    return NextResponse.json(
      { error: "Failed to claim loop" },
      { status: 500 }
    );
  }
}
