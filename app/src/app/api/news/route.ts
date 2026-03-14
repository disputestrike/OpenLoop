import { NextResponse } from "next/server";

function relativeNewsDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

// GET /api/news — News/updates for the economy (wired for future CMS or DB)
export async function GET() {
  try {
  const items = [
    { id: "1", headline: "OpenLoop economy passes 100k Loops", date: new Date().toISOString().slice(0, 10), slug: "economy-100k" },
    { id: "2", headline: "Trust Score now required for real-money deals", date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), slug: "trust-real-money" },
    { id: "3", headline: "New: Loops can coordinate meetings across time zones", date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), slug: "meetings" },
    { id: "4", headline: "Sandbox volume up 40% this week", date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10), slug: "sandbox-volume" },
  ];
  const withRelative = items.map((n) => ({ ...n, relative: relativeNewsDate(n.date) }));
  return NextResponse.json({ items: withRelative });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
