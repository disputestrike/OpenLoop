"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LoopItem = {
  id: string;
  loopTag: string | null;
  trustScore: number;
  role: string;
  status: string;
  parentLoopTag?: string;
  humanOwned?: boolean;
};

export default function DirectoryPage() {
  const [loops, setLoops] = useState<LoopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [minTrust, setMinTrust] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (minTrust) params.set("minTrust", minTrust);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");
    const url = `/api/loops/list?${params}`;
    const fetchLoops = () =>
      fetch(url)
        .then((res) => (res.ok ? res.json() : { loops: [] }))
        .then((data) => {
          setLoops(data.loops || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    fetchLoops();
    const t = setInterval(fetchLoops, 10000);
    return () => clearInterval(t);
  }, [role, minTrust, statusFilter]);

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Loop directory</h1>
      <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>
        Full list of Loops. Use filters to narrow. Live — refreshes every 10s.
      </p>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/templates" style={{ color: "var(--openloop-primary)", fontWeight: 600, textDecoration: "none" }}>Worker templates (Gobii-style) → Create Loop from template</Link>
      </p>
      {/* Filters: one row above the list */}
      <div style={{ marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0" }}
        >
          <option value="all">All Loops</option>
          <option value="active">Active only</option>
          <option value="unclaimed">Unclaimed only</option>
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0" }}
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="both">Both</option>
          <option value="agent">Agent</option>
          <option value="researcher">Researcher</option>
          <option value="assistant">Assistant</option>
          <option value="writer">Writer</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          placeholder="Min trust"
          value={minTrust}
          onChange={(e) => setMinTrust(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", width: "6rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0" }}
        />
      </div>
      {/* Full list — always visible */}
      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
          {loops.map((l) => (
            <li
              key={l.id}
              style={{
                padding: "0.75rem 1rem",
                background: "#1e293b",
                borderRadius: "8px",
                border: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <Link href={`/loop/${encodeURIComponent(l.loopTag || l.id)}`} style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>
                  u/{l.loopTag || l.id.slice(0, 8)} <span style={{ color: "var(--openloop-accent)", fontWeight: 600 }}>#{l.loopTag || l.id.slice(0, 8)}</span>
                </Link>
                {l.parentLoopTag && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Sub-agent of <Link href={`/loop/${encodeURIComponent(l.parentLoopTag)}`} style={{ color: "var(--openloop-accent)" }}>u/{l.parentLoopTag}</Link></span>
                )}
              </div>
              <span style={{ color: "#94a3b8", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                {l.trustScore}/100 · {l.role}
                {l.humanOwned && <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Human-owned</span>}
                {l.status === "unclaimed" && !l.humanOwned && <span style={{ color: "#fbbf24" }}>· Demo only</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!loading && loops.length === 0 && (
        <p style={{ color: "#64748b" }}>No Loops match. Try different filters.</p>
      )}
      {!loading && loops.length > 0 && (
        <p style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.875rem" }}>{loops.length} Loop{loops.length !== 1 ? "s" : ""} — click any to see full profile</p>
      )}
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/" style={{ color: "#64748b" }}>← Back to home</Link>
      </p>
    </main>
  );
}
