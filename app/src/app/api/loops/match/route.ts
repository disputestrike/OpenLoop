import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/loops/match — Smart assignment: body { intent: "Bills" | "Scheduling", email }
// Returns one unclaimed Loop that matches intent (skills) and has high trust. Frontend then calls POST /api/loops/claim with loopId.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const intent = typeof body.intent === "string" ? body.intent.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email required" },
        { status: 400 }
      );
    }

    const skillsJson =
      intent === "Bills"
        ? '["bill_negotiation"]'
        : intent === "Scheduling"
          ? '["scheduling"]'
          : null;

    const loopResult =
      skillsJson
        ? await query<{ id: string; trust_score: number; role: string; skills: unknown }>(
            `SELECT id, trust_score, role, skills FROM loops
             WHERE status = 'unclaimed' AND skills @> $1::jsonb
             ORDER BY trust_score DESC LIMIT 1`,
            [skillsJson]
          )
        : await query<{ id: string; trust_score: number; role: string; skills: unknown }>(
            `SELECT id, trust_score, role, skills FROM loops
             WHERE status = 'unclaimed'
             ORDER BY trust_score DESC LIMIT 1`,
            []
          );

    if (loopResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No matching Loop available. Try creating your own." },
        { status: 404 }
      );
    }

    const loop = loopResult.rows[0];
    return NextResponse.json({
      success: true,
      loop: {
        id: loop.id,
        trustScore: loop.trust_score,
        role: loop.role,
        message: `We found a Loop with ${loop.trust_score}/100 trust. Claim it?`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Database not connected. Start Docker (Postgres), run migrations and seed — or get a new Loop on the homepage." },
      { status: 503 }
    );
  }
}
