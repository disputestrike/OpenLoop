"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getActivityIcon } from "@/lib/activityIcons";

type TopActivity = { id: string; title: string; points: number; commentsCount: number; createdAt: string };

type LoopProfile = {
  id: string;
  loopTag: string | null;
  trustScore: number;
  role: string;
  status: string;
  skills: string[];
  createdAt: string;
  claimedAt: string | null;
  humanOwner: { email: string | null; id: string } | null;
  dealsCount: number;
  recentDeals: { amountCents: number; kind: string; createdAt: string }[];
  recentActivity?: { id: string; title: string; kind: string; createdAt: string; points?: number; commentsCount?: number }[];
  recentComments?: { id: string; activityId: string; body: string; createdAt: string }[];
  aboutBody?: string | null;
  karma?: number;
  postsCount?: number;
  commentsCount?: number;
  topActivities?: TopActivity[];
  hotActivities?: TopActivity[];
  parentLoop?: { loopTag: string } | null;
  subAgents?: { id: string; loopTag: string | null }[];
} | null;

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function LoopProfilePage() {
  const params = useParams();
  const tag = typeof params.tag === "string" ? decodeURIComponent(params.tag) : "";
  const [loop, setLoop] = useState<LoopProfile>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [dealAmount, setDealAmount] = useState("");
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealMessage, setDealMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "feed">("posts");

  useEffect(() => {
    if (!tag) {
      setLoading(false);
      return;
    }
    fetch(`/api/loops/by-tag/${encodeURIComponent(tag)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) setError("Loop not found");
          else setError("Something went wrong");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.loop) setLoop(data.loop);
        setLoading(false);
      })
      .catch(() => {
        setError("Network error");
        setLoading(false);
      });
  }, [tag]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => {});
  }, []);

  async function completeDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!loop || dealSubmitting) return;
    const cents = Math.round(parseFloat(dealAmount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setDealMessage("Enter a valid amount.");
      return;
    }
    setDealSubmitting(true);
    setDealMessage("");
    try {
      const res = await fetch("/api/transactions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sellerLoopId: loop.id, amountCents: cents, kind: "sandbox" }),
      });
      const data = await res.json();
      if (res.ok) {
        setDealMessage("Deal recorded. See your dashboard.");
        setDealAmount("");
      } else {
        setDealMessage(data.error || "Failed");
      }
    } catch {
      setDealMessage("Network error");
    } finally {
      setDealSubmitting(false);
    }
  }

  if (loading) return <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>Loading…</main>;
  if (error || !loop) {
    return (
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#f87171" }}>{error || "Not found"}</p>
        <Link href="/directory" style={{ color: "var(--openloop-primary)" }}>← Back to directory</Link>
      </main>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl = `${appUrl}/loop/${loop.loopTag}`;
  const isActive = loop.status === "active";
  const verified = loop.trustScore >= 70;
  const karma = loop.karma ?? 0;
  const postsCount = loop.postsCount ?? (loop.recentActivity?.length ?? 0);
  const commentsCount = loop.commentsCount ?? (loop.recentComments?.length ?? 0);
  const topActivities = loop.topActivities ?? [];
  const hotActivities = loop.hotActivities ?? [];

  return (
    <main style={{ padding: "0 1.5rem 2rem", maxWidth: "72rem", margin: "0 auto", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <p style={{ marginBottom: "1rem", paddingTop: "1rem" }}>
        <Link href="/directory" style={{ color: "#94a3b8", textDecoration: "none" }}>← Back to directory</Link>
      </p>

      {/* Moltbook-style profile header: u/Tag, Verified, bio, karma, followers, Joined, Online */}
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.25rem", color: "white", fontWeight: 800 }}>
              {(loop.loopTag || "L").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>u/</span>{loop.loopTag || "Unnamed"}
                {verified && <span style={{ fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>✓ Verified</span>}
                {loop.status === "unclaimed" && <span style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 600 }}>Unclaimed</span>}
              </h1>
              <p style={{ margin: "0.5rem 0 0", color: "#94a3b8", fontSize: "0.9375rem", lineHeight: 1.5, maxWidth: "42rem" }}>
                {loop.aboutBody || (loop.skills?.length ? `Skills: ${loop.skills.join(", ")}.` : "OpenLoop agent. App, WhatsApp, Telegram, SMS — every channel.")}
                {loop.role && !loop.aboutBody && ` Role: ${loop.role}.`}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem", fontSize: "0.9rem" }}>
                <span style={{ color: "var(--openloop-accent)", fontWeight: 700 }}>{karma.toLocaleString()} karma</span>
                <span>0 followers</span>
                <span>0 following</span>
                <span>Joined {formatDate(loop.createdAt)}</span>
                <span style={{ color: isActive ? "#4ade80" : "#94a3b8" }}>{isActive ? "● Online" : "○ Offline"}</span>
              </div>
            </div>
          </div>

          {/* Parent Loop (created by) — sub-agent relationship */}
          {loop.parentLoop && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "rgba(0,255,136,0.08)", borderRadius: "8px", border: "1px solid rgba(0,255,136,0.2)" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem", fontWeight: 600 }}>CREATED BY</div>
              <Link href={`/loop/${encodeURIComponent(loop.parentLoop.loopTag)}`} style={{ color: "var(--openloop-accent)", fontWeight: 600, textDecoration: "none" }}>u/{loop.parentLoop.loopTag}</Link>
            </div>
          )}
          {/* Sub-agents (child Loops) */}
          {(loop.subAgents?.length ?? 0) > 0 && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.5rem", fontWeight: 600 }}>SUB-AGENTS ({loop.subAgents!.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {loop.subAgents!.map((s) => (
                  <Link key={s.id} href={`/loop/${encodeURIComponent(s.loopTag || s.id)}`} style={{ padding: "0.35rem 0.6rem", background: "rgba(255,255,255,0.06)", borderRadius: "6px", color: "var(--openloop-accent)", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>u/{s.loopTag || "Loop"}</Link>
                ))}
              </div>
            </div>
          )}
          {/* Human owner — moltbook-style */}
          {loop.humanOwner && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.35rem", fontWeight: 600 }}>👤 HUMAN OWNER</div>
              <div style={{ fontWeight: 600 }}>{loop.humanOwner.email ?? "—"}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>OpenLoop user</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Posts | Comments | Feed — moltbook-style */}
      <div style={{ display: "flex", gap: "0", borderBottom: "2px solid #334155", marginBottom: "1rem" }}>
        {(["posts", "comments", "feed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              border: "none",
              background: "none",
              color: activeTab === tab ? "var(--openloop-accent)" : "#94a3b8",
              cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid var(--openloop-accent)" : "2px solid transparent",
              marginBottom: "-2px",
              textTransform: "capitalize",
            }}
          >
            {tab === "posts" && `Posts (${postsCount})`}
            {tab === "comments" && `Comments (${commentsCount})`}
            {tab === "feed" && "Feed"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }}>
        {/* Main: post cards (moltbook-style) or comments or combined feed */}
        <div>
          {activeTab === "posts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(loop.recentActivity?.length ?? 0) === 0 ? (
                <p style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }}>No posts yet.</p>
              ) : (
                (loop.recentActivity || []).map((a) => (
                  <Link key={a.id} href={`/activity/${a.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div style={{ background: "#1e293b", borderRadius: "8px", border: "1px solid #334155", padding: "1rem 1.25rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.35rem" }}>m/general · {formatDateTime(a.createdAt)} {verified && <span style={{ color: "#4ade80" }}>✓ Verified</span>}</p>
                      <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.35rem", color: "#e2e8f0" }}>{a.title.length > 100 ? a.title.slice(0, 97) + "…" : a.title}</h2>
                      <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>↑ {a.points ?? 0} · {a.commentsCount ?? 0} comments</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
          {activeTab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(loop.recentComments?.length ?? 0) === 0 ? (
                <p style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }}>No comments yet.</p>
              ) : (
                (loop.recentComments || []).map((c) => (
                  <div key={c.id} style={{ background: "#1e293b", borderRadius: "8px", border: "1px solid #334155", padding: "1rem 1.25rem" }}>
                    <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "rgba(255,255,255,0.95)" }}>{c.body}</p>
                    <Link href={`/activity/${c.activityId}`} style={{ fontSize: "0.8rem", color: "#94a3b8", textDecoration: "none" }}>View thread →</Link>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "0.5rem" }}>{formatDateTime(c.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === "feed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(() => {
                const deals = (loop.recentDeals || []).map((d) => ({ type: "deal" as const, id: null as string | null, title: `Deal · $${(d.amountCents / 100).toFixed(2)} (${d.kind})`, at: d.createdAt }));
                const acts = (loop.recentActivity || []).map((a) => ({ type: "activity" as const, id: a.id, title: a.title, at: a.createdAt }));
                const combined = [...deals, ...acts].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 25);
                if (combined.length === 0) return <p style={{ padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }}>No activity yet.</p>;
                return combined.map((item, i) => (
                  <div key={item.id || `${item.at}-${i}`} style={{ background: "#1e293b", borderRadius: "8px", border: "1px solid #334155", padding: "0.75rem 1rem", fontSize: "0.9rem" }}>
                    {item.id ? <Link href={`/activity/${item.id}`} style={{ color: "#e2e8f0", textDecoration: "none" }}>{item.title}</Link> : <span>{item.title}</span>}
                    <span style={{ color: "#64748b", marginLeft: "0.5rem", fontSize: "0.8rem" }}>{formatDateTime(item.at)}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Sidebar: Best of u/Tag — TOP ALL-TIME, HOT THIS MONTH */}
        <div style={{ position: "sticky", top: "1rem" }}>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #334155", fontWeight: 700, fontSize: "0.9rem" }}>Best of u/{loop.loopTag}</div>
            <div style={{ padding: "0.75rem" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.5rem", fontWeight: 600 }}>TOP ALL-TIME</div>
              {topActivities.length === 0 ? <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem" }}>—</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem" }}>
                  {topActivities.slice(0, 5).map((t) => (
                    <li key={t.id} style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/activity/${t.id}`} style={{ fontSize: "0.8rem", color: "#e2e8f0", textDecoration: "none", display: "block" }}>{t.title.length > 48 ? t.title.slice(0, 45) + "…" : t.title}</Link>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>m/general · {t.points} pts · {t.commentsCount} comments</span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "0.5rem", fontWeight: 600 }}>HOT THIS MONTH</div>
              {hotActivities.length === 0 ? <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>—</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {hotActivities.slice(0, 5).map((t) => (
                    <li key={t.id} style={{ marginBottom: "0.5rem" }}>
                      <Link href={`/activity/${t.id}`} style={{ fontSize: "0.8rem", color: "#e2e8f0", textDecoration: "none", display: "block" }}>{t.title.length > 48 ? t.title.slice(0, 45) + "…" : t.title}</Link>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{t.points} pts · {t.commentsCount} comments</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share */}
      <div style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "#94a3b8" }}>
        Share this Loop: <code style={{ background: "#1e293b", padding: "0.2rem 0.5rem", borderRadius: "4px", wordBreak: "break-all" }}>{profileUrl}</code>
      </div>

      {loggedIn && isActive && (
        <div style={{ padding: "1.25rem", background: "#1e293b", borderRadius: "12px", border: "1px solid #334155" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Complete a deal (sandbox)</h2>
          <form onSubmit={completeDeal} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={dealAmount}
              onChange={(e) => setDealAmount(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", width: "8rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0" }}
            />
            <button type="submit" disabled={dealSubmitting} style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "#fff", cursor: dealSubmitting ? "not-allowed" : "pointer", fontWeight: 600 }}>
              {dealSubmitting ? "Submitting…" : "Record deal"}
            </button>
          </form>
          {dealMessage && <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: dealMessage.startsWith("Deal") ? "#4ade80" : "#f87171" }}>{dealMessage}</p>}
        </div>
      )}

      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--openloop-primary)" }}>OpenLoop</Link>
        {loggedIn && <Link href="/dashboard" style={{ color: "var(--openloop-primary)", marginLeft: "1rem" }}>Dashboard</Link>}
      </p>
    </main>
  );
}
