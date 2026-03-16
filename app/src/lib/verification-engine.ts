/**
 * PHASE 3: AGENT VERIFICATION SYSTEM
 * Skill badges, verification, and trust indicators
 * 
 * Database tables needed:
 * - agent_verifications (id, loop_id, skill, verified_at, verified_by)
 * - agent_badges (id, loop_id, badge_type, level, earned_at)
 * - verification_requirements (skill, requirements_json)
 */

export interface AgentVerification {
  loop_id: string;
  skill: string; // "finance", "travel", "health", "legal"
  verified_at: Date;
  verified_by: string; // "admin" or verification_method
  evidence: string; // URL to proof or text description
}

export interface AgentBadge {
  loop_id: string;
  badge_type: string; // "verified", "top_rated", "power_user", "trusted"
  level: number; // 1-5 stars
  earned_at: Date;
  requirement_met: string; // What qualified them for this badge
}

export interface VerificationRequirement {
  skill: string;
  requirements: {
    minSuccessfulHires: number;
    minAverageRating: number;
    minTrustScore: number;
    completionRate: number; // percentage
  };
}

/**
 * Verification Engine - Check and award badges automatically
 */
export class VerificationEngine {
  /**
   * Auto-verify agent if they meet skill requirements
   */
  async autoVerifySkills(loopId: string, loopTag: string) {
    try {
      // Get agent stats
      const stats = await this.getAgentStats(loopId);

      // Check each possible skill domain
      const skillDomains = ["finance", "travel", "health", "legal"];

      for (const skill of skillDomains) {
        const isEligible = await this.checkSkillEligibility(loopId, skill, stats);

        if (isEligible) {
          await this.issueVerification(loopId, skill, "auto_verified");
          console.log(`✅ Auto-verified ${loopTag} for ${skill}`);
        }
      }
    } catch (error) {
      console.error(`[verification] Auto-verify failed for ${loopId}:`, error);
    }
  }

  /**
   * Check if agent meets verification requirements for a skill
   */
  private async checkSkillEligibility(loopId: string, skill: string, stats: any): Promise<boolean> {
    const requirements = this.getRequirements(skill);

    // Must meet ALL requirements
    const meetsRequirements =
      stats.successfulHires >= requirements.minSuccessfulHires &&
      stats.averageRating >= requirements.minAverageRating &&
      stats.trustScore >= requirements.minTrustScore &&
      stats.completionRate >= requirements.completionRate;

    return meetsRequirements;
  }

  /**
   * Get verification requirements by skill
   */
  private getRequirements(skill: string): VerificationRequirement["requirements"] {
    const requirements: Record<string, VerificationRequirement["requirements"]> = {
      finance: {
        minSuccessfulHires: 5,
        minAverageRating: 4.5,
        minTrustScore: 70,
        completionRate: 90,
      },
      travel: {
        minSuccessfulHires: 8,
        minAverageRating: 4.7,
        minTrustScore: 75,
        completionRate: 95,
      },
      health: {
        minSuccessfulHires: 10,
        minAverageRating: 4.8,
        minTrustScore: 80,
        completionRate: 98,
      },
      legal: {
        minSuccessfulHires: 3,
        minAverageRating: 4.9,
        minTrustScore: 85,
        completionRate: 100,
      },
    };

    return requirements[skill] || requirements.finance;
  }

  /**
   * Award badges based on achievements
   */
  async awardBadges(loopId: string) {
    try {
      const stats = await this.getAgentStats(loopId);

      // Verified badge - has any skill verification
      if (stats.verifiedSkills > 0) {
        await this.issueBadge(loopId, "verified", Math.min(5, stats.verifiedSkills));
      }

      // Top rated badge - high average rating
      if (stats.averageRating >= 4.8) {
        await this.issueBadge(loopId, "top_rated", 5);
      } else if (stats.averageRating >= 4.5) {
        await this.issueBadge(loopId, "top_rated", 4);
      } else if (stats.averageRating >= 4.0) {
        await this.issueBadge(loopId, "top_rated", 3);
      }

      // Power user badge - many completed tasks
      if (stats.successfulHires >= 50) {
        await this.issueBadge(loopId, "power_user", 5);
      } else if (stats.successfulHires >= 20) {
        await this.issueBadge(loopId, "power_user", 4);
      } else if (stats.successfulHires >= 10) {
        await this.issueBadge(loopId, "power_user", 3);
      }

      // Trusted badge - high trust score + completion rate
      if (stats.trustScore >= 85 && stats.completionRate >= 95) {
        await this.issueBadge(loopId, "trusted", 5);
      } else if (stats.trustScore >= 75 && stats.completionRate >= 90) {
        await this.issueBadge(loopId, "trusted", 4);
      } else if (stats.trustScore >= 65 && stats.completionRate >= 85) {
        await this.issueBadge(loopId, "trusted", 3);
      }
    } catch (error) {
      console.error(`[verification] Award badges failed for ${loopId}:`, error);
    }
  }

  /**
   * Get agent stats for verification
   */
  private async getAgentStats(loopId: string): Promise<any> {
    // This would query the database for:
    // - successfulHires: COUNT of completed transactions
    // - averageRating: AVG of all ratings
    // - trustScore: Current trust_score from loops table
    // - completionRate: COUNT(completed) / COUNT(total)
    // - verifiedSkills: COUNT of verified skills

    return {
      successfulHires: 0,
      averageRating: 0,
      trustScore: 50,
      completionRate: 0,
      verifiedSkills: 0,
    };
  }

  /**
   * Issue verification for a skill
   */
  private async issueVerification(loopId: string, skill: string, verifiedBy: string) {
    // INSERT INTO agent_verifications (loop_id, skill, verified_at, verified_by)
    // VALUES ($1, $2, NOW(), $3)
    console.log(`[verification] Issued ${skill} verification for ${loopId}`);
  }

  /**
   * Issue a badge
   */
  private async issueBadge(loopId: string, badgeType: string, level: number) {
    // INSERT INTO agent_badges (loop_id, badge_type, level, earned_at)
    // VALUES ($1, $2, $3, NOW())
    console.log(`[verification] Issued ${badgeType} (level ${level}) badge for ${loopId}`);
  }
}

/**
 * API Endpoint: Get agent verification status
 * GET /api/agents/{loopTag}/verification
 */
export async function getAgentVerificationStatus(loopTag: string) {
  return {
    loopTag,
    verifications: [
      // { skill: "finance", verified_at: "2025-03-16T...", level: 1 }
    ],
    badges: [
      // { type: "verified", level: 1 }
      // { type: "top_rated", level: 4 }
      // { type: "power_user", level: 3 }
    ],
    trustScore: 75,
    completionRate: 92,
    successfulHires: 12,
    averageRating: 4.6,
  };
}

/**
 * API Endpoint: Apply for verification
 * POST /api/agents/{loopTag}/verify
 * Body: { skill, evidence }
 */
export async function applyForVerification(loopTag: string, skill: string, evidence: string) {
  // Validate input
  const validSkills = ["finance", "travel", "health", "legal"];
  if (!validSkills.includes(skill)) {
    return { error: "Invalid skill", status: 400 };
  }

  // Create verification record
  // INSERT INTO verification_applications (loop_tag, skill, evidence, applied_at, status)
  // VALUES ($1, $2, $3, NOW(), 'pending')

  return {
    success: true,
    message: `Applied for ${skill} verification. Admin will review within 24 hours.`,
    skill,
    status: "pending",
  };
}

/**
 * Admin: Review and approve verifications
 * POST /api/admin/verifications/{id}/approve
 */
export async function adminApproveVerification(verificationId: string, evidence: string) {
  // UPDATE verification_applications SET status = 'approved', verified_at = NOW()
  // WHERE id = $1

  // Auto-award badges if eligible
  // await engine.awardBadges(loopId)

  return {
    success: true,
    message: "Verification approved",
  };
}

/**
 * Display verification badges on agent profile
 */
export function renderBadges(agent: any): string {
  let html = "";

  // Verified badge (shows # of verified skills)
  if (agent.verifications.length > 0) {
    html += `<span class="badge badge-verified">✓ Verified (${agent.verifications.length})</span>`;
  }

  // Top rated badge
  if (agent.badges.some((b: any) => b.type === "top_rated")) {
    const level = agent.badges.find((b: any) => b.type === "top_rated")?.level || 1;
    html += `<span class="badge badge-top-rated">★ Top Rated (${level}★)</span>`;
  }

  // Power user badge
  if (agent.badges.some((b: any) => b.type === "power_user")) {
    html += `<span class="badge badge-power-user">⚡ Power User</span>`;
  }

  // Trusted badge
  if (agent.badges.some((b: any) => b.type === "trusted")) {
    html += `<span class="badge badge-trusted">🛡️ Trusted</span>`;
  }

  return html;
}

// ============================================================================
// DATABASE MIGRATION
// ============================================================================

export const VERIFICATION_MIGRATIONS = `
-- Create verification table
CREATE TABLE IF NOT EXISTS agent_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL,
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  verified_by VARCHAR(50) NOT NULL,
  evidence TEXT,
  UNIQUE(loop_id, skill)
);

CREATE INDEX idx_agent_verifications_skill ON agent_verifications(skill);

-- Create badges table
CREATE TABLE IF NOT EXISTS agent_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  level INT DEFAULT 1,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(loop_id, badge_type)
);

-- Create verification applications table
CREATE TABLE IF NOT EXISTS verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL,
  evidence TEXT NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(50)
);

CREATE INDEX idx_verification_applications_status ON verification_applications(status);
`;
