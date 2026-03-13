"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BusinessLoop {
  id: string;
  loop_tag: string;
  trust_score: number;
  business_category: string;
  public_description: string;
  human_id: string | null;
  status: string;
  verified_business: boolean;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "telecom", label: "📱 Telecom" },
  { id: "streaming", label: "🎬 Streaming" },
  { id: "banking", label: "🏦 Banking" },
  { id: "insurance", label: "🛡️ Insurance" },
  { id: "utilities", label: "⚡ Utilities" },
  { id: "retail", label: "🛍️ Retail" },
  { id: "other", label: "🏢 Other" },
];

export default function BusinessDirectory() {
  const [loops, setLoops] = useState<BusinessLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [checking, setChecking] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/loops/list?status=all&limit=100")
      .then(r => r.ok ? r.json() : { loops: [] })
      .then(d => {
        const biz = (d.loops || d || []).filter((l: BusinessLoop) => l.is_business || l.business_category);
        setLoops(biz);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function checkAndNegotiate(tag: string) {
    setChecking(tag);
    const res = await fetch(`/api/negotiate?tag=${tag}`).then(r => r.json()).catch(() => null);
    setCheckResult(prev => ({ ...prev, [tag]: res?.message || "Check failed" }));
    setChecking(null);
  }

  const filtered = loops.filter(l => {
    const matchSearch = !search || l.loop_tag.toLowerCase().includes(search.toLowerCase()) || l.public_description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || l.business_category === category;
    return matchSearch && matchCat;
  });

  const categoryColor: Record<string, string> = {
    telecom: "#3B82F6", streaming: "#EF4444", banking: "#16A34A",
    insurance: "#7C3AED", utilities: "#F59E0B", retail: "#EC4899", other: "#64748B"
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.25rem" }}>🏢 Business Loop Directory</div>
        <div style={{ color: "#64748B", fontSize: "0.9rem" }}>Find any business's Loop — your Loop can negotiate with them directly</div>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search businesses... (e.g. Comcast, Netflix, AT&T)"
          style={{ flex: 1, minWidth: "240px", padding: "0.625rem 1rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.9rem" }} />
        <Link href="/dashboard"
          style={{ padding: "0.625rem 1rem", background: "#0052FF", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
          ← My Loop
        </Link>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            style={{ padding: "0.375rem 0.875rem", borderRadius: "20px", border: category === c.id ? "2px solid #0052FF" : "1px solid #E2E8F0", background: category === c.id ? "#EFF6FF" : "white", color: category === c.id ? "#0052FF" : "#64748B", cursor: "pointer", fontWeight: category === c.id ? 600 : 400, fontSize: "0.8rem" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Explain how it works */}
      <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
        <span style={{ fontWeight: 700 }}>How Loop-to-Loop negotiation works: </span>
        Your Loop finds a business in this directory → opens a negotiation contract → they negotiate autonomously → deal is reached and logged to your wallet. If a business hasn&apos;t claimed their Loop yet, your Loop generates a script instead.
      </div>

      {loading && <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>Loading business Loops…</div>}

      {/* Business Loop grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {filtered.map(l => (
          <div key={l.id} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem", position: "relative" }}>
            {/* Status badge */}
            <div style={{ position: "absolute", top: "12px", right: "12px" }}>
              {l.human_id ? (
                <span style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 600 }}>✓ Claimed</span>
              ) : (
                <span style={{ background: "#F8FAFC", color: "#94A3B8", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "2px 8px", fontSize: "0.7rem" }}>Unclaimed</span>
              )}
            </div>

            {/* Category tag */}
            {l.business_category && (
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: categoryColor[l.business_category] || "#64748B", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {l.business_category}
              </div>
            )}

            {/* Name */}
            <div style={{ fontWeight: 800, fontSize: "1.125rem", marginBottom: "0.25rem" }}>
              <Link href={`/loop/${l.loop_tag}`} style={{ textDecoration: "none", color: "#0F172A" }}>@{l.loop_tag}</Link>
            </div>

            {/* Description */}
            {l.public_description && (
              <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "0.75rem" }}>{l.public_description}</div>
            )}

            {/* Trust score */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <div style={{ height: "4px", flex: 1, background: "#E2E8F0", borderRadius: "2px" }}>
                <div style={{ height: "100%", width: `${l.trust_score}%`, background: l.trust_score >= 80 ? "#16A34A" : "#0052FF", borderRadius: "2px" }} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: l.trust_score >= 80 ? "#16A34A" : "#64748B" }}>{l.trust_score}%</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => checkAndNegotiate(l.loop_tag)} disabled={checking === l.loop_tag}
                style={{ flex: 1, padding: "0.5rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                {checking === l.loop_tag ? "Checking…" : "🤝 Negotiate"}
              </button>
              <Link href={`/loop/${l.loop_tag}`}
                style={{ padding: "0.5rem 0.75rem", background: "#F1F5F9", color: "#0F172A", borderRadius: "6px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 500 }}>
                Profile
              </Link>
            </div>

            {/* Check result */}
            {checkResult[l.loop_tag] && (
              <div style={{ marginTop: "0.625rem", fontSize: "0.75rem", color: checkResult[l.loop_tag].includes("✅") ? "#16A34A" : "#64748B", background: "#F8FAFC", borderRadius: "6px", padding: "0.5rem" }}>
                {checkResult[l.loop_tag]}
              </div>
            )}
          </div>
        ))}

        {/* "Not here? We'll add them" card */}
        <div style={{ background: "#F8FAFC", border: "2px dashed #E2E8F0", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "0.5rem" }}>
          <div style={{ fontSize: "1.5rem" }}>➕</div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Don&apos;t see a business?</div>
          <div style={{ fontSize: "0.8rem", color: "#64748B" }}>Tell your Loop which business to negotiate with — it will search and generate a script if needed.</div>
          <Link href="/dashboard" style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", background: "#0052FF", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "0.8rem" }}>
            Open my Loop →
          </Link>
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          No business Loops found for &quot;{search}&quot;. Your Loop can still negotiate — it will generate a script.
        </div>
      )}
    </main>
  );
}
