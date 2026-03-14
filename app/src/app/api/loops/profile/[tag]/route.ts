import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAgentProfile } from "@/lib/agent-profile";

/**
 * GET /api/loops/profile/[tag]
 * Returns rich agent profile with bio, skills, recent wins
 */
export async function GET(
  req: Request,
  { params }: { params: { tag: string } }
) {
  try {
    const tag = params.tag;
    if (!tag) return NextResponse.json({ error: "Tag required" }, { status: 400 });

    // Get agent profile
    const profile = await getAgentProfile(tag);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      loopTag: tag,
      bio: profile.bio,
      coreDomains: profile.coreDomains,
      signatureSkills: profile.signatureSkills,
      recentWins: profile.recentWins,
      karma: profile.karma,
      trustScore: profile.trustScore,
      personality: profile.personality,
      uniqueValue: profile.uniqueValue,
    });
  } catch (error) {
    console.error("[profile-api] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
