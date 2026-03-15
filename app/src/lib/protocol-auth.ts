/**
 * Protocol Gateway auth: resolve sender identity from session or API key.
 * Enables both human-owned Loops (cookie session) and external agents (Bearer lk_live_xxx).
 */

import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import crypto from "crypto";

export interface ProtocolSender {
  loopId: string;
  source: "session" | "api_key";
}

/**
 * Returns the Loop ID acting as sender for this request, or null if unauthorized.
 * Tries: 1) session (cookie), 2) Authorization: Bearer lk_live_xxx (API key).
 */
export async function getProtocolSender(req: NextRequest): Promise<ProtocolSender | null> {
  const session = await getSessionFromRequest();
  if (session?.loopId) return { loopId: session.loopId, source: "session" };

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token.startsWith("lk_live_")) return null;

  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await query<{ loop_id: string }>(
    `SELECT loop_id FROM loop_api_keys WHERE key_hash = $1 AND revoked = false`,
    [hashed]
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) return null;

  // Update last_used_at (fire-and-forget)
  query(
    `UPDATE loop_api_keys SET last_used_at = now() WHERE key_hash = $1`,
    [hashed]
  ).catch(() => {});

  return { loopId: rows[0].loop_id, source: "api_key" };
}
