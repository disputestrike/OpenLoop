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
 * Get agent profile - uses STORED profile fields from loop creation
 * NOT extracted from activities (that was wrong)
 */
export async function buildAgentProfile(loopTag: string): Promise<AgentProfile | null> {
  try {
    // Try with stored profile fields first
    let loop: {
      id: string;
      karma: string;
      trust_score: string;
      agent_bio: string | null;
      agent_core_domains: string[] | null;
      agent_signature_skills: string[] | null;
      agent_personality: string | null;
      agent_unique_value: string | null;
    } | null = null;

    try {
      const loopRes = await query<{
        id: string;
        karma: string;
        trust_score: string;
        agent_bio: string | null;
        agent_core_domains: string[] | null;
        agent_signature_skills: string[] | null;
        agent_personality: string | null;
        agent_unique_value: string | null;
      }>(
        `SELECT id, 0 as karma, trust_score, agent_bio, agent_core_domains,
                agent_signature_skills, agent_personality, agent_unique_value
         FROM loops WHERE loop_tag = $1`,
        [loopTag]
      );
      loop = loopRes.rows[0] || null;
    } catch (colErr) {
      // agent_bio columns don't exist yet - fallback to basic query
      console.log("[agent-profile] agent_bio columns missing, using basic query");
      const basicRes = await query<{
        id: string;
        karma: string;
        trust_score: string;
      }>(
        `SELECT id, '0' as karma, COALESCE(trust_score,50)::text as trust_score FROM loops WHERE loop_tag = $1`,
        [loopTag]
      );
      if (basicRes.rows[0]) {
        loop = {
          ...basicRes.rows[0],
          agent_bio: null,
          agent_core_domains: null,
          agent_signature_skills: null,
          agent_personality: null,
          agent_unique_value: null,
        };
      }
    }

    if (!loop) return null;

    const loopId = loop.id;
    const karma = parseInt(loop.karma || "0");
    const trustScore = parseInt(loop.trust_score || "50");

    // Use STORED profile fields if available
    const bio = loop.agent_bio || "";
    const coreDomains = loop.agent_core_domains || [];
    const signatureSkills = loop.agent_signature_skills || [];
    const personality = loop.agent_personality || "analytical";
    const uniqueValue = loop.agent_unique_value || "";

    // Get recent wins for display (separate from profile definition)
    const activitiesRes = await query<{
      title: string;
      domain: string;
    }>(
      `SELECT title, domain 
       FROM activities 
       WHERE loop_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [loopId]
    );

    const recentWins = (activitiesRes.rows || []).map((a) => {
      const valueMatch = a.title.match(/[\$€]\d+|(\d+)\s*(dollar|cent|hour|month|year)/i);
      const value = valueMatch ? valueMatch[0] : undefined;
      return {
        outcome: a.title,
        domain: a.domain || "general",
        value,
      };
    });

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
