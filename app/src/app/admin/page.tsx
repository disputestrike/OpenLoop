"use client";

import { useState } from "react";
import Link from "next/link";

type AdminStats = {
  loops?: { total: number; byStatus: Record<string, number> };
  transactions?: { total: number };
  trustDistribution?: { bucket: string; count: number }[];
  _demo?: boolean;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function loadStats() {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin?admin_secret=${encodeURIComponent(secret)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Invalid secret" : "Failed to load");
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", minHeight: "100vh", background: "var(--openloop-section-bg)" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0, color: "var(--openloop-text)" }}>Admin panel</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/analytics" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 600 }}>Analytics</Link>
          <Link href="/admin/llm-report" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 600 }}>LLM Report</Link>
          <Link href="/admin/corpus" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 600 }}>Corpus</Link>
          <Link href="/" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none" }}>← Back to OpenLoop</Link>
        </div>
      </div>
      <p style={{ color: "var(--openloop-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        Use <strong>demo</strong> to see mock stats when the database is not connected. Set <code>ADMIN_SECRET</code> in env for real admin.
      </p>
      <input
        type="password"
        placeholder="Admin secret (try: demo)"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && loadStats()}
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
        onClick={loadStats}
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
        {loading ? "Loading…" : "Load stats"}
      </button>
      {error && <p style={{ color: "#dc3545", marginTop: "0.5rem" }}>{error}</p>}
      {stats && !("error" in stats) && (
        <div style={{ marginTop: "2rem" }}>
          {stats._demo && (
            <p style={{ padding: "0.5rem 0.75rem", background: "var(--openloop-accent)", color: "#0a0a0a", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem" }}>
              Demo mode — showing mock data. Connect a database and set ADMIN_SECRET for real stats.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {stats.loops && (
              <div style={{ padding: "1rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Total Loops</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--openloop-primary)" }}>{stats.loops.total}</div>
                {stats.loops.byStatus && (
                  <div style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                    {Object.entries(stats.loops.byStatus).map(([k, v]) => (
                      <span key={k} style={{ marginRight: "0.5rem" }}>{k}: {v}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {stats.transactions && (
              <div style={{ padding: "1rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--openloop-text-muted)", marginBottom: "0.25rem" }}>Deals completed</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--openloop-accent)" }}>{stats.transactions.total}</div>
              </div>
            )}
          </div>
          {stats.trustDistribution && stats.trustDistribution.length > 0 && (
            <div style={{ padding: "1rem", background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>Trust distribution</div>
              {stats.trustDistribution.map((r) => (
                <div key={r.bucket} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ width: "4rem", fontSize: "0.8rem" }}>{r.bucket}</span>
                  <div style={{ flex: 1, height: "8px", background: "#eee", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (r.count / (stats.loops?.total || 1)) * 100)}%`, height: "100%", background: "var(--openloop-gradient)", borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{r.count}</span>
                </div>
              ))}
            </div>
          )}
          <pre style={{ marginTop: "1.5rem", padding: "1rem", background: "#1e293b", color: "#e2e8f0", borderRadius: "8px", overflow: "auto", fontSize: "0.75rem" }}>
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
