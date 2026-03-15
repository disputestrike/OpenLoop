import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

/**
 * GET /api/integrations/google-calendar
 * List upcoming calendar events (requires user's Google refresh token)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get user's Google refresh token from DB
    const tokenRes = await query<{ google_refresh_token: string }>(
      `SELECT google_refresh_token FROM humans WHERE id = $1`,
      [session.humanId]
    ).catch(() => ({ rows: [] as any[] }));

    const refreshToken = tokenRes.rows[0]?.google_refresh_token;
    if (!refreshToken) {
      return NextResponse.json({
        error: "Google Calendar not connected",
        connectUrl: buildOAuthUrl(req),
        message: "Connect your Google account to use Calendar features.",
      }, { status: 400 });
    }

    // Exchange refresh token for access token
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh Google token. Please reconnect." }, { status: 401 });
    }

    // Fetch upcoming events
    const now = new Date().toISOString();
    const maxTime = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${maxTime}&maxResults=20&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calRes.ok) {
      return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
    }

    const data = await calRes.json();
    const events = (data.items || []).map((e: any) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location,
      status: e.status,
    }));

    return NextResponse.json({ events, count: events.length });
  } catch (error) {
    console.error("[google-calendar]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/integrations/google-calendar
 * Create a calendar event
 * Body: { summary, description?, startTime, endTime, location? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { summary, description, startTime, endTime, location } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: "summary, startTime, endTime required" }, { status: 400 });
    }

    const tokenRes = await query<{ google_refresh_token: string }>(
      `SELECT google_refresh_token FROM humans WHERE id = $1`,
      [session.humanId]
    ).catch(() => ({ rows: [] as any[] }));

    const refreshToken = tokenRes.rows[0]?.google_refresh_token;
    if (!refreshToken) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) {
      return NextResponse.json({ error: "Token expired. Please reconnect." }, { status: 401 });
    }

    const event = {
      summary,
      description: description || `Created by OpenLoop`,
      start: { dateTime: startTime, timeZone: "America/New_York" },
      end: { dateTime: endTime, timeZone: "America/New_York" },
      location: location || undefined,
    };

    const calRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      console.error("[google-calendar] Create event failed:", errText);
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }

    const created = await calRes.json();

    // Log as activity
    await query(
      `INSERT INTO activities (source_type, loop_id, kind, title, domain) VALUES ('calendar', $1, 'outcome', $2, 'scheduling')`,
      [session.loopId, `Booked: ${summary} on ${new Date(startTime).toLocaleDateString()}`]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      event: { id: created.id, summary: created.summary, start: created.start, htmlLink: created.htmlLink },
    });
  } catch (error) {
    console.error("[google-calendar]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Helper: exchange refresh token for access token
async function getAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

// Helper: build OAuth URL for Calendar scope
function buildOAuthUrl(req: NextRequest): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(origin + "/api/integrations/google-calendar/callback")}&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&access_type=offline&prompt=consent`;
}
