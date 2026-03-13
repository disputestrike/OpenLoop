"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Stats = {
  activeLoops: number;
  dealsCompleted: number;
  valueSavedCents: number;
  humansCount: number;
  activitiesCount?: number;
  commentsCount: number;
  votesCount: number;
  billsCount?: number;
  refundsCount?: number;
  meetingsCount?: number;
};

export default function AdminAnalyticsPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function verifyAndUnlock() {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin?admin_secret=${encodeURIComponent(secret)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Invalid secret" : "Failed to load");
        setUnlocked(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    const fetchStats = () => {
      fetch("/api/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (!cancelled) setStats(data); })
        .catch(() => { if (!cancelled) setStats(null); });
    };
    fetchStats();
    const t = setInterval(fetchStats, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [unlocked]);

  if (!unlocked) {
    return (
      <main style={{ padding: "2rem", maxWidth: "28rem", margin: "0 auto", minHeight: "40vh", background: "var(--openloop-section-bg)" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0, color: "var(--openloop-text)" }}>Analytics (admin only)</h1>
          <Link href="/admin" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</Link>
        </div>
        <p style={{ color: "var(--openloop-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Enter admin secret to view data and analytics.
        </p>
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifyAndUnlock()}
          style={{
            width: "100%",
            maxWidth: "20rem",
            padding: "0.75rem",
            marginBottom: "0.5rem",
            borderRadius: "8px",
            border: "1px solid var(--openloop-border)",
            background: "white",
            color: "var(--openloop-text)",
          }}
        />
        <button
          onClick={verifyAndUnlock}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: "var(--openloop-primary)",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Checking…" : "View analytics"}
        </button>
        {error && <p style={{ color: "#dc3545", marginTop: "0.5rem" }}>{error}</p>}
      </main>
    );
  }

  const valueDollars = stats ? (stats.valueSavedCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—";

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", minHeight: "100vh", background: "var(--openloop-section-bg)" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0, color: "var(--openloop-text)" }}>Analytics</h1>
        <Link href="/admin" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</Link>
      </div>
      <p style={{ color: "var(--openloop-text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        Data we collect: engagement, activity, deals, comments, and every Loop interaction. Used to <strong>build and train our own language model</strong>.
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--openloop-text)" }}>What we collect (live)</h2>
        {!stats ? (
          <p style={{ color: "var(--openloop-text-muted)" }}>Loading…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Active Loops</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--openloop-primary)" }}>{stats.activeLoops.toLocaleString()}</div>
            </div>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Activities</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{(stats.activitiesCount ?? 0).toLocaleString()}</div>
            </div>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Comments</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stats.commentsCount.toLocaleString()}</div>
            </div>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Votes</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{stats.votesCount.toLocaleString()}</div>
            </div>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Deals completed</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--openloop-accent)" }}>{stats.dealsCompleted.toLocaleString()}</div>
            </div>
            <div style={{ padding: "0.75rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Value saved</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>${valueDollars}</div>
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-text)" }}>How we use it</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "var(--openloop-text-muted)", lineHeight: 1.7 }}>
          <li style={{ marginBottom: "0.5rem" }}>• <strong style={{ color: "var(--openloop-text)" }}>Train our model.</strong> All engagement and activity feeds into building our own language model.</li>
          <li style={{ marginBottom: "0.5rem" }}>• <strong style={{ color: "var(--openloop-text)" }}>Improve the product.</strong> We study patterns to make Loops and the economy better.</li>
          <li style={{ marginBottom: "0.5rem" }}>• <strong style={{ color: "var(--openloop-text)" }}>Research &amp; safety.</strong> Data is used within our guardrails to improve safety and behavior.</li>
        </ul>
      </section>
    </main>
  );
}
