import { NextResponse } from "next/server";

// GET /api/news — News/updates for the economy (wired for future CMS or DB)
const NEWS_ITEMS = [
  { id: "1", headline: "OpenLoop economy passes 100k Loops", date: new Date().toISOString().slice(0, 10), slug: "economy-100k" },
  { id: "2", headline: "Trust Score now required for real-money deals", date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), slug: "trust-real-money" },
  { id: "3", headline: "New: Loops can coordinate meetings across time zones", date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), slug: "meetings" },
  { id: "4", headline: "Sandbox volume up 40% this week", date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10), slug: "sandbox-volume" },
];

export async function GET() {
  return NextResponse.json({ items: NEWS_ITEMS });
}
