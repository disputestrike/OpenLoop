/**
 * Simple Claim-Based Auth for OpenLoop
 * 
 * Flow:
 * 1. User goes to /claim
 * 2. Selects loop to claim OR creates new one
 * 3. Gets session token
 * 4. Token stored in cookie
 * 5. Dashboard reads cookie, loads loop
 */

import { cookies } from "next/headers";
import { query } from "@/lib/db";
import crypto from "crypto";

export interface ClaimSession {
  loopId: string;
  humanId: string;
  token: string;
  createdAt: number;
}

const SESSION_EXPIRY = 90 * 24 * 60 * 60 * 1000; // 90 days
const SESSION_COOKIE = "openloop-session";

/**
 * Create or get a loop for user, return session token
 */
export async function claimLoop(loopTagOrId: string): Promise<ClaimSession | null> {
  try {
    // Ensure loop_sessions table exists (in case migration 023 didn't run)
    await query(`CREATE TABLE IF NOT EXISTS loop_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loop_id UUID NOT NULL,
      human_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`).catch(() => {});

    // Check if it's a valid loop ID or tag
    let loopRes = await query<{ id: string }>(
      `SELECT id FROM loops WHERE id = $1 OR loop_tag = $2 LIMIT 1`,
      [loopTagOrId, loopTagOrId]
    );

    let loopId = loopRes.rows[0]?.id;

    // If no loop found, create one WITH DEFAULT AGENT PROFILE
    if (!loopId) {
      const newLoopRes = await query<{ id: string }>(
        `INSERT INTO loops (
          loop_tag, 
          status, 
          role, 
          trust_score,
          agent_bio,
          agent_core_domains,
          agent_signature_skills,
          agent_personality,
          agent_unique_value
        ) 
         VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9
        ) 
         RETURNING id`,
        [
          null, 
          "active", 
          "personal", 
          50,
          "Personal AI Loop: your agent for handling tasks, finding deals, and getting things done.",
          '{"General", "Tasks", "Research"}',
          '{"problem_solving", "research", "analysis"}',
          "analytical",
          "Versatile personal assistant"
        ]
      );
      loopId = newLoopRes.rows[0]?.id;
    }

    if (!loopId) return null;

    // Generate session token
    const token = crypto.randomBytes(32).toString("hex");
    const humanId = crypto.randomBytes(16).toString("hex");

    // Store session in database
    await query(
      `INSERT INTO loop_sessions (loop_id, human_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')
       ON CONFLICT (token) DO UPDATE SET expires_at = NOW() + INTERVAL '90 days'`,
      [loopId, humanId, token]
    );

    return {
      loopId,
      humanId,
      token,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error("[claim-auth] Error claiming loop:", error);
    return null;
  }
}

/**
 * Verify session token and return loop ID
 */
export async function verifySession(token: string): Promise<ClaimSession | null> {
  try {
    if (!token) return null;

    const result = await query<{ loop_id: string; human_id: string }>(
      `SELECT loop_id, human_id FROM loop_sessions 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) return null;

    const session = result.rows[0];
    return {
      loopId: session.loop_id,
      humanId: session.human_id,
      token,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error("[claim-auth] Error verifying session:", error);
    return null;
  }
}

/**
 * Get session from cookies
 */
export async function getSessionFromCookies(): Promise<ClaimSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) return null;

    return await verifySession(sessionToken);
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      maxAge: SESSION_EXPIRY / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } catch (error) {
    console.error("[claim-auth] Error setting cookie:", error);
  }
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // Ignore errors
  }
}
