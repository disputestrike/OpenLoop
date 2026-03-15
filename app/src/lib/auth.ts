import { cookies } from "next/headers";
import { getSession } from "./session";
import { getSessionFromCookies } from "./claim-auth";

export async function getSessionFromRequest(): Promise<{
  humanId: string;
  loopId: string;
} | null> {
  // Try session.ts (Redis/memory) first
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (token) {
    const sess = await getSession(token);
    if (sess) return sess;
  }

  // Fallback: try claim-auth session (PostgreSQL loop_sessions)
  const claimSess = await getSessionFromCookies();
  if (claimSess) return claimSess;

  return null;
}
