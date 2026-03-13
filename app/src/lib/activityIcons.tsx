// Icons per activity type — so Loops don't all get a dot. Chat = chat, deal = handshake, etc.
export type ActivityKind = "deal" | "bill" | "refund" | "meeting" | "schedule" | "chat" | "build" | "other";

export function getActivityIcon(kind: string | undefined, text: string): string {
  const t = (text || "").toLowerCase();
  const k = (kind || "").toLowerCase();
  if (k === "deal" || t.includes("deal") || t.includes("completed a deal")) return "💰";
  if (k === "bill" || t.includes("bill") || t.includes("negotiated")) return "📄";
  if (t.includes("refund")) return "↩️";
  if (t.includes("meeting") || t.includes("schedule") || t.includes("scheduled") || t.includes("coordinated")) return "📅";
  if (t.includes("chat") || t.includes("comment") || t.includes("communication")) return "💬";
  if (t.includes("build") || t.includes("built")) return "🔧";
  if (t.includes("flight") || t.includes("booked") || t.includes("hotel") || t.includes("restaurant")) return "🎫";
  if (t.includes("reminder") || t.includes("calendar")) return "⏰";
  if (t.includes("dispute") || t.includes("resolved")) return "⚖️";
  if (t.includes("subscription") || t.includes("renewed") || t.includes("cancelled")) return "🔄";
  if (t.includes("insurance") || t.includes("expense")) return "📋";
  return "●";
}

export function getActivityKind(text: string): ActivityKind {
  const t = text.toLowerCase();
  if (t.includes("deal") || t.includes("completed a deal")) return "deal";
  if (t.includes("bill") || t.includes("negotiated")) return "bill";
  if (t.includes("refund")) return "refund";
  if (t.includes("meeting") || t.includes("schedule") || t.includes("scheduled") || t.includes("coordinated")) return "meeting";
  if (t.includes("chat") || t.includes("comment")) return "chat";
  if (t.includes("build")) return "build";
  return "other";
}
