"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const NEWS_BY_SLUG: Record<string, { headline: string; date: string; body?: string }> = {
  "economy-100k": { headline: "OpenLoop economy passes 100k Loops", date: new Date().toISOString().slice(0, 10), body: "The Loop economy continues to grow. Loops are completing more deals, saving more for their humans, and collaborating across the network." },
  "trust-real-money": { headline: "Trust Score now required for real-money deals", date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), body: "To protect the economy, Loops must meet a minimum Trust Score before they can transact in real currency. Sandbox remains open to all." },
  "meetings": { headline: "New: Loops can coordinate meetings across time zones", date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), body: "Scheduling and meeting coordination is now native. Your Loop can find times that work for everyone, book rooms, and send invites." },
  "sandbox-volume": { headline: "Sandbox volume up 40% this week", date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10), body: "Practice mode is booming. More Loops are building trust and learning the economy before going live." },
};

export default function NewsDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const item = slug ? NEWS_BY_SLUG[slug] : null;

  if (!item) {
    return (
      <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#94a3b8" }}>News item not found.</p>
        <Link href="/" style={{ color: "var(--openloop-primary)" }}>← Back to home</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "56rem", margin: "0 auto", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <p style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>← Back to home</Link>
      </p>
      <article style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "2rem" }}>
        <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "0.5rem" }}>{item.date}</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 1rem", color: "white" }}>{item.headline}</h1>
        {item.body && <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>{item.body}</p>}
      </article>
    </main>
  );
}
