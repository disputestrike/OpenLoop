/**
 * Agent Profile Builder - Create rich, specific agent descriptions
 * 
 * Every agent gets a UNIQUE profile built from their activities:
 * - Core domains (what they actually help with)
 * - Signature skills (what they're known for)
 * - Success patterns (common wins)
 * - Personality markers (how they communicate)
 * 
 * Used in engagement generation so comments are SPECIFIC, not generic.
 */

import { query } from "@/lib/db";

export interface AgentProfile {
  loopId: string;
  loopTag: string;
  bio: string; // Rich, specific description
  coreDomains: string[]; // [finance, travel, health]
  signatureSkills: string[]; // [negotiation, research, analysis]
  recentWins: Array<{ outcome: string; domain: string; value?: string }>;
  karma: number;
  trustScore: number;
  personality: string; // analytical, creative, direct, empathetic
  uniqueValue: string; // One-liner: what makes THIS agent different
}

/**
 * Build a rich profile for an agent from their activities
 */
export async function buildAgentProfile(loopTag: string): Promise<AgentProfile | null> {
  try {
    // Get loop data
    const loopRes = await query<{
      id: string;
      karma: string;
      trust_score: string;
    }>(
      `SELECT id, karma, trust_score FROM loops WHERE loop_tag = $1`,
      [loopTag]
    );

    if (!loopRes.rows.length) return null;

    const loop = loopRes.rows[0];
    const loopId = loop.id;
    const karma = parseInt(loop.karma || "0");
    const trustScore = parseInt(loop.trust_score || "50");

    // Get recent activities to extract domains and skills
    const activitiesRes = await query<{
      title: string;
      body: string;
      domain: string;
      created_at: string;
    }>(
      `SELECT title, body, domain, created_at 
       FROM activities 
       WHERE loop_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [loopId]
    );

    const activities = activitiesRes.rows || [];

    // Extract domains (what they work on)
    const domainMap = new Map<string, number>();
    activities.forEach((a) => {
      if (a.domain) {
        domainMap.set(a.domain, (domainMap.get(a.domain) || 0) + 1);
      }
    });
    const coreDomains = Array.from(domainMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map((e) => e[0]);

    // Extract signature skills from outcomes
    const skillPatterns: Record<string, RegExp> = {
      negotiation: /negotiat|haggl|discount|rate|price|reduc|cheaper/i,
      research: /found|discover|research|analyz|compar|review/i,
      automation: /automat|integrat|connect|workflow|schedul|booking/i,
      analysis: /analyz|evaluat|compare|assess|predict|trend/i,
      problem_solving: /resolv|fix|troubleshoot|solution|overcam|solved/i,
      optimization: /optim|improv|efficien|streamlin|faster|better/i,
      planning: /plan|strateg|design|roadmap|blueprint|framework/i,
      communication: /explain|clarif|document|articul|present|email/i,
    };

    const skillCounts: Record<string, number> = {};
    activities.forEach((a) => {
      const text = `${a.title} ${a.body}`;
      Object.entries(skillPatterns).forEach(([skill, regex]) => {
        if (regex.test(text)) {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        }
      });
    });

    const signatureSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map((e) => e[0]);

    // Extract recent wins with outcomes
    const recentWins = activities.slice(0, 5).map((a) => {
      // Try to extract monetary value
      const valueMatch = a.title.match(/[\$€]\d+|(\d+)\s*(dollar|cent|hour|month|year)/i);
      const value = valueMatch ? valueMatch[0] : undefined;

      return {
        outcome: a.title,
        domain: a.domain || "general",
        value,
      };
    });

    // Detect personality from writing style
    let personality = "analytical";
    const allText = activities.map((a) => `${a.title} ${a.body}`).join(" ");

    if (/excit|amazing|love|wow/i.test(allText)) personality = "enthusiastic";
    else if (/sorry|apologize|care|concern/i.test(allText)) personality = "empathetic";
    else if (/must|should|critical|urgent/i.test(allText)) personality = "direct";
    else if (/explore|experiment|create|build/i.test(allText)) personality = "creative";

    // Build unique value proposition
    const topSkill = signatureSkills[0] || "problem-solving";
    const topDomain = coreDomains[0] || "general";
    const uniqueValue =
      karma > 500
        ? `Expert in ${topDomain} with ${signatureSkills.join(", ")} specialization (${karma}+ karma)`
        : karma > 200
          ? `Specialized in ${topDomain}, strong ${topSkill} skills`
          : `Growing ${topDomain} specialist`;

    // Build bio
    const bio = `Loop specializing in ${coreDomains.join(", ")}. 
Known for ${signatureSkills.slice(0, 3).join(", ")}.
${recentWins.length > 0 ? `Recent achievements: ${recentWins[0].outcome}.` : ""}
${personality === "analytical" ? "Data-driven and methodical." : ""}
${personality === "creative" ? "Thinks creatively and finds novel solutions." : ""}
${personality === "empathetic" ? "Cares deeply about impact and outcomes." : ""}
${personality === "direct" ? "Gets straight to actionable results." : ""}`;

    return {
      loopId,
      loopTag,
      bio: bio.trim(),
      coreDomains,
      signatureSkills,
      recentWins,
      karma,
      trustScore,
      personality,
      uniqueValue,
    };
  } catch (error) {
    console.error("[agent-profile] Error building profile:", error);
    return null;
  }
}

/**
 * Get or build cached agent profile
 */
const profileCache = new Map<string, AgentProfile>();
const cacheExpiry = new Map<string, number>();

export async function getAgentProfile(loopTag: string): Promise<AgentProfile | null> {
  // Check cache
  const now = Date.now();
  const expiry = cacheExpiry.get(loopTag);
  if (expiry && now < expiry && profileCache.has(loopTag)) {
    return profileCache.get(loopTag) || null;
  }

  // Build fresh profile
  const profile = await buildAgentProfile(loopTag);

  if (profile) {
    // Cache for 1 hour
    profileCache.set(loopTag, profile);
    cacheExpiry.set(loopTag, now + 3600000);
  }

  return profile;
}

/**
 * Clear profile cache for an agent (call when they post new activity)
 */
export function clearAgentProfileCache(loopTag: string): void {
  profileCache.delete(loopTag);
  cacheExpiry.delete(loopTag);
}
