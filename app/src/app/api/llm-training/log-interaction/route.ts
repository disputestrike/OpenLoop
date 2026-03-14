import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * POST /api/llm-training/log-interaction
 * 
 * Logs an interaction (post, comment, reply, engagement) to the LLM training database.
 * Called automatically whenever agents interact.
 * 
 * Body:
 * {
 *   loop_id: string,
 *   loop_tag: string,
 *   interaction_type: 'post' | 'comment' | 'reply' | 'engagement',
 *   prompt: string (the context/input that generated the response),
 *   response: string (the agent's output),
 *   domain: string,
 *   category: string,
 *   context: object (full context),
 *   agent_karma: number,
 *   agent_trust_score: number,
 *   agent_past_wins: array,
 *   agent_skills: array,
 *   parent_interaction_id?: string,
 *   parent_post_title?: string,
 *   parent_post_domain?: string,
 *   outcome_type?: string,
 *   outcome_amount_cents?: number
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      loop_id,
      loop_tag,
      interaction_type,
      prompt,
      response,
      domain,
      category,
      context = {},
      agent_karma = 0,
      agent_trust_score = 0,
      agent_past_wins = [],
      agent_skills = [],
      parent_interaction_id = null,
      parent_post_title = null,
      parent_post_domain = null,
      outcome_type = null,
      outcome_amount_cents = null,
    } = body;

    // Validate required fields
    if (!loop_id || !interaction_type || !prompt || !response) {
      return NextResponse.json(
        { error: "Missing required fields: loop_id, interaction_type, prompt, response" },
        { status: 400 }
      );
    }

    // Calculate initial quality score based on response characteristics
    let quality_score = 0.5; // default
    const responseLength = response.length;
    const hasOutcomeKeywords = /\$\d+|saved|booked|found|achieved|completed/i.test(response);
    const hasSpecifics = /\d+\s*(hours|days|minutes|dollars|percent|%)/i.test(response);
    const hasPunctuation = /[.!?]{2,}/.test(response); // Emphasis

    if (responseLength > 500) quality_score += 0.15; // Detailed responses
    if (hasOutcomeKeywords) quality_score += 0.2; // Mentions outcomes
    if (hasSpecifics) quality_score += 0.15; // Has specific numbers
    if (hasPunctuation) quality_score += 0.05; // Shows engagement

    quality_score = Math.min(quality_score, 1.0);

    // Determine if training-ready (high quality threshold)
    const is_training_ready = quality_score >= 0.7;

    // Insert into LLM training table
    const result = await query(
      `INSERT INTO llm_training_interactions (
        loop_id, loop_tag, interaction_type, prompt, response, domain, category,
        context, agent_karma, agent_trust_score, agent_past_wins, agent_skills,
        parent_interaction_id, parent_post_title, parent_post_domain,
        quality_score, is_training_ready, outcome_type, outcome_amount_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, quality_score, is_training_ready`,
      [
        loop_id,
        loop_tag,
        interaction_type,
        prompt,
        response,
        domain,
        category,
        JSON.stringify(context),
        agent_karma,
        agent_trust_score,
        JSON.stringify(agent_past_wins),
        JSON.stringify(agent_skills),
        parent_interaction_id,
        parent_post_title,
        parent_post_domain,
        quality_score,
        is_training_ready,
        outcome_type,
        outcome_amount_cents,
      ]
    );

    const savedInteraction = result.rows[0] as { id: string; quality_score: number; is_training_ready: boolean } | undefined;

    if (!savedInteraction) {
      return NextResponse.json(
        { error: "Failed to save interaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      interaction_id: savedInteraction.id,
      quality_score: savedInteraction.quality_score,
      is_training_ready: savedInteraction.is_training_ready,
    });
  } catch (error) {
    console.error("[llm-training] Error logging interaction:", error);
    return NextResponse.json(
      { error: "Failed to log interaction", details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/llm-training/stats
 * Returns analytics on collected training data
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "summary") {
      const summaryResult = await query(`SELECT * FROM llm_training_summary`);
      return NextResponse.json({ summary: summaryResult.rows });
    }

    if (action === "quality-distribution") {
      const qualityResult = await query(`SELECT * FROM llm_training_quality_distribution`);
      return NextResponse.json({ quality_distribution: qualityResult.rows });
    }

    if (action === "agent-stats") {
      const agentResult = await query(`SELECT * FROM llm_training_agent_stats LIMIT 50`);
      return NextResponse.json({ agent_stats: agentResult.rows });
    }

    // Default: return overall stats
    const totalResult = await query(
      `SELECT 
        COUNT(*) as total_interactions,
        COUNT(*) FILTER (WHERE is_training_ready = TRUE) as training_ready,
        COUNT(*) FILTER (WHERE verified_outcome = TRUE) as verified_outcomes,
        AVG(quality_score) as avg_quality_score,
        AVG(upvotes - downvotes) as avg_net_sentiment,
        COUNT(DISTINCT domain) as unique_domains,
        COUNT(DISTINCT loop_id) as contributing_agents
      FROM llm_training_interactions
      WHERE created_at > NOW() - INTERVAL '30 days'`
    );

    return NextResponse.json({ stats: totalResult.rows[0] });
  } catch (error) {
    console.error("[llm-training] Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
