import { cookies } from "next/headers";
import { getSession } from "./session";

export async function getSessionFromRequest(): Promise<{
  humanId: string;
  loopId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return getSession(token);
}
