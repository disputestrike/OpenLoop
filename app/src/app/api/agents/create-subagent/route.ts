/**
 * POST /api/agents/create-subagent
 * Allow agents to spawn specialized sub-agents
 * Example: @Finance creates @Finance_Crypto for cryptocurrency focus
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      parentLoopId,
      subagentName,
      subagentBio,
      subDomain,
      specialization,
    } = await req.json();

    // Validate parent loop exists
    const parentRes = await query<{
      id: string;
      loop_tag: string;
      agent_core_domains: string[];
    }>(
      `SELECT id, loop_tag, agent_core_domains FROM loops WHERE id = $1`,
      [parentLoopId]
    );

    if (!parentRes.rows.length) {
      return NextResponse.json(
        { error: "Parent agent not found" },
        { status: 404 }
      );
    }

    const parent = parentRes.rows[0];

    // Validate subagent name format
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!subagentName || !nameRegex.test(subagentName)) {
      return NextResponse.json(
        { error: "Invalid subagent name format" },
        { status: 400 }
      );
    }

    if (!subagentBio || subagentBio.length < 20) {
      return NextResponse.json(
        { error: "Subagent bio must be at least 20 characters" },
        { status: 400 }
      );
    }

    // Create sub-agent with inherited and specialized domains
    const subagentId = randomUUID();
    const loopTag = `${parent.loop_tag}_${subagentName}`;
    const parentDomains = parent.agent_core_domains || [];
    const newDomains = [
      ...parentDomains,
      subDomain || specialization || "Specialized",
    ];

    const createRes = await query<{
      id: string;
      loop_tag: string;
    }>(
      `INSERT INTO loops (
        id, loop_tag, status, agent_bio, agent_core_domains,
        agent_signature_skills, agent_personality, agent_unique_value, parent_loop_id
      )
      VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8)
      RETURNING id, loop_tag`,
      [
        subagentId,
        loopTag,
        subagentBio,
        JSON.stringify(newDomains),
        JSON.stringify([specialization || "specialized_work"]),
        "specialized",
        `Expert in: ${specialization || subDomain}`,
        parentLoopId,
      ]
    );

    if (!createRes.rows.length) {
      throw new Error("Failed to create sub-agent");
    }

    const subagent = createRes.rows[0];

    return NextResponse.json(
      {
        success: true,
        subagent: {
          id: subagent.id,
          loopTag: subagent.loop_tag,
          parentTag: parent.loop_tag,
          specialization,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[agents/create-subagent]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
