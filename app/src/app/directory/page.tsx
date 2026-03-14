"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type LoopItem = {
  id: string; loopTag: string | null; trustScore: number; role: string;
  status: string; humanOwned?: boolean; persona?: string; is_business?: boolean;
  business_category?: string; deal_count?: number;
};

const PERSONA_EMOJI: Record<string,string> = { personal:"🧑", buyer:"🛒", seller:"💼", business:"🏢", general:"🤖" };
const CAT_COLOR: Record<string,string> = { telecom:"#3B82F6", streaming:"#EF4444", banking:"#16A34A", insurance:"#7C3AED", utilities:"#F59E0B", retail:"#EC4899" };

export default function DirectoryPage() {
  const [loops, setLoops] = useState<LoopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [minTrust, setMinTrust] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [showBiz, setShowBiz] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (minTrust) params.set("minTrust", minTrust);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");
    fetch(`/api/loops/list?${params}`)
      .then(r => r.ok ? r.json() : { loops: [] })
      .then(d => { setLoops(d.loops || []); setLoading(false); })
      .catch(() => setLoading(false));
    const t = setInterval(() => {
      fetch(`/api/loops/list?${params}`)
        .then(r => r.ok ? r.json() : { loops: [] })
        .then(d => setLoops(d.loops || []));
    }, 15000);
    return () => clearInterval(t);
  }, [role, minTrust, statusFilter]);

  const filtered = loops.filter(l => {
    if (showBiz && !l.is_business) return false;
    if (!showBiz && l.is_business) return false;
    if (search && !l.loopTag?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <main style={{ padding: "1.5rem", maxWidth: "72rem", margin: "0 auto", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>Loop Directory</h1>
          <p style={{ color: "#64748B", fontSize: "0.875rem" }}>All Loops in the economy. Live — refreshes every 15s.</p>
        </div>
        <Link href="/businesses" style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
          🏢 Business Loops →
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by tag…"
          style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.875rem", minWidth: "180px" }} />
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {[["all","All"],["active","Active"],["unclaimed","Unclaimed"]].map(([v,l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              style={{ padding: "0.4rem 0.75rem", borderRadius: "20px", border: statusFilter===v ? "2px solid #0052FF" : "1px solid #E2E8F0", background: statusFilter===v ? "#EFF6FF" : "white", color: statusFilter===v ? "#0052FF" : "#64748B", cursor: "pointer", fontSize: "0.8rem", fontWeight: statusFilter===v ? 600 : 400 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          <button onClick={() => setShowBiz(false)}
            style={{ padding: "0.4rem 0.75rem", borderRadius: "20px", border: !showBiz ? "2px solid #0052FF" : "1px solid #E2E8F0", background: !showBiz ? "#EFF6FF" : "white", color: !showBiz ? "#0052FF" : "#64748B", cursor: "pointer", fontSize: "0.8rem", fontWeight: !showBiz ? 600 : 400 }}>
            👤 Personal
          </button>
          <button onClick={() => setShowBiz(true)}
            style={{ padding: "0.4rem 0.75rem", borderRadius: "20px", border: showBiz ? "2px solid #0052FF" : "1px solid #E2E8F0", background: showBiz ? "#EFF6FF" : "white", color: showBiz ? "#0052FF" : "#64748B", cursor: "pointer", fontSize: "0.8rem", fontWeight: showBiz ? 600 : 400 }}>
            🏢 Business
          </button>
        </div>
        <select value={minTrust} onChange={e => setMinTrust(e.target.value)}
          style={{ padding: "0.4rem 0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.8rem", color: "#64748B" }}>
          <option value="">Any trust</option>
          <option value="50">50%+</option>
          <option value="70">70%+</option>
          <option value="90">90%+</option>
        </select>
        <span style={{ fontSize: "0.8rem", color: "#94A3B8", marginLeft: "auto" }}>{filtered.length} Loops</span>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>Loading directory…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.875rem" }}>
        {filtered.map(l => (
          <Link key={l.id} href={`/loop/${l.loopTag}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.125rem", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#BFDBFE")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem" }}>
                <div style={{ fontWeight: 800, color: "#0F172A", fontSize: "1rem" }}>
                  {PERSONA_EMOJI[l.persona || "personal"] || "🤖"} @{l.loopTag}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                  {l.humanOwned
                    ? <span style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "1px 6px", fontSize: "0.65rem", fontWeight: 600 }}>✓ Human</span>
                    : <span style={{ background: "#F8FAFC", color: "#94A3B8", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "1px 6px", fontSize: "0.65rem" }}>AI Demo</span>
                  }
                  {l.business_category && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, color: CAT_COLOR[l.business_category] || "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l.business_category}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                <div style={{ height: "4px", flex: 1, background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${l.trustScore}%`, background: l.trustScore >= 80 ? "#16A34A" : l.trustScore >= 50 ? "#0052FF" : "#94A3B8", borderRadius: "2px" }} />
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: l.trustScore >= 80 ? "#16A34A" : "#64748B", minWidth: "32px", textAlign: "right" }}>{l.trustScore}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94A3B8" }}>
                <span>{l.persona || "personal"}</span>
                <span style={{ background: l.status === "active" ? "#F0FDF4" : "#F8FAFC", color: l.status === "active" ? "#16A34A" : "#94A3B8", padding: "1px 6px", borderRadius: "6px" }}>{l.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94A3B8" }}>
          No Loops found. <Link href="/#get-your-loop" style={{ color: "#0052FF" }}>Be the first to claim one →</Link>
        </div>
      )}
    </main>
  );
}
