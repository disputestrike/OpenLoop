"use client";

import { useEffect, useState } from "react";

interface WalletEvent {
  id: string;
  event_type: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  description: string;
  verification_tier: string;
  created_at: string;
}

interface WalletStats {
  totalSavedCents: number;
  totalDealsCents: number;
  winsCount: number;
}

export default function WalletPanel() {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [events, setEvents] = useState<WalletEvent[]>([]);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [showVerify, setShowVerify] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verify win form
  const [winDesc, setWinDesc] = useState("");
  const [winAmount, setWinAmount] = useState("");
  const [winTier, setWinTier] = useState("self_reported");
  const [winEvidence, setWinEvidence] = useState("");
  const [winSaving, setWinSaving] = useState(false);
  const [winMsg, setWinMsg] = useState("");

  // Tip form
  const [tipAmount, setTipAmount] = useState("5");
  const [tipLoading, setTipLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me/wallet", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setBalanceCents(d.balanceCents);
          setEvents(d.events || []);
          setStats(d.stats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function recordWin() {
    setWinSaving(true);
    setWinMsg("");
    try {
      const res = await fetch("/api/me/verify-win", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: winDesc,
          amountSavedCents: Math.round(parseFloat(winAmount || "0") * 100),
          verificationTier: winTier,
          evidenceUrl: winEvidence || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setWinMsg(d.message);
        setBalanceCents(prev => (prev || 0) + (d.netCents || 0));
        setWinDesc(""); setWinAmount(""); setWinEvidence("");
        // refresh events
        fetch("/api/me/wallet", { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) { setEvents(d.events || []); setStats(d.stats); } })
          .catch(() => {});
      } else {
        setWinMsg(d.error || "Failed to record win");
      }
    } catch {
      setWinMsg("Network error");
    } finally {
      setWinSaving(false);
    }
  }

  async function startTip() {
    setTipLoading(true);
    try {
      const res = await fetch("/api/me/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountCents: Math.round(parseFloat(tipAmount) * 100) }),
      });
      const d = await res.json();
      if (res.ok && d.url) window.location.href = d.url;
      else alert(d.error || "Failed to start payment");
    } catch {
      alert("Network error");
    } finally {
      setTipLoading(false);
    }
  }

  const tierBadge = (tier: string) => {
    if (tier === "system") return "✓✓ System verified";
    if (tier === "evidence") return "✓ Evidence attached";
    return "Self reported";
  };

  const tierColor = (tier: string) => {
    if (tier === "system") return "#16A34A";
    if (tier === "evidence") return "#0052FF";
    return "#64748B";
  };

  if (loading) return <div style={{ padding: "1rem", color: "#94A3B8", fontSize: "0.875rem" }}>Loading wallet…</div>;

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Balance card */}
      <div style={{ background: "linear-gradient(135deg, #0052FF 0%, #1E40AF 100%)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem", color: "white" }}>
        <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.25rem", fontWeight: 600, letterSpacing: "0.05em" }}>LOOP WALLET</div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          ${((balanceCents || 0) / 100).toFixed(2)}
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>
          {stats?.winsCount || 0} verified wins · ${((stats?.totalSavedCents || 0) / 100).toFixed(2)} total saved
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button onClick={() => { setShowVerify(true); setShowTip(false); }}
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            + Record Win
          </button>
          <button onClick={() => { setShowTip(true); setShowVerify(false); }}
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            💳 Real Transaction
          </button>
        </div>
      </div>

      {/* Record Win form */}
      {showVerify && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.75rem", color: "#15803D" }}>Record a verified win</div>
          <input value={winDesc} onChange={e => setWinDesc(e.target.value)}
            placeholder="What did your Loop do? e.g. Negotiated Comcast bill"
            style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #BBF7D0", marginBottom: "0.5rem", fontSize: "0.875rem", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input value={winAmount} onChange={e => setWinAmount(e.target.value)}
              placeholder="Amount saved ($)"
              type="number" min="0"
              style={{ flex: 1, padding: "0.625rem", borderRadius: "6px", border: "1px solid #BBF7D0", fontSize: "0.875rem" }} />
            <select value={winTier} onChange={e => setWinTier(e.target.value)}
              style={{ flex: 1, padding: "0.625rem", borderRadius: "6px", border: "1px solid #BBF7D0", fontSize: "0.875rem", background: "white" }}>
              <option value="self_reported">Self reported</option>
              <option value="evidence">Evidence attached</option>
              <option value="system">System verified</option>
            </select>
          </div>
          {winTier === "evidence" && (
            <input value={winEvidence} onChange={e => setWinEvidence(e.target.value)}
              placeholder="Link to screenshot, email, or receipt"
              style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #BBF7D0", marginBottom: "0.5rem", fontSize: "0.875rem", boxSizing: "border-box" }} />
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={recordWin} disabled={!winDesc || winSaving}
              style={{ background: "#16A34A", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: winSaving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
              {winSaving ? "Recording…" : "Record Win"}
            </button>
            <button onClick={() => { setShowVerify(false); setWinMsg(""); }}
              style={{ background: "#F1F5F9", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
              Cancel
            </button>
          </div>
          {winMsg && <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: winMsg.includes("Win") ? "#16A34A" : "#DC2626" }}>{winMsg}</div>}
        </div>
      )}

      {/* Tip / Real Transaction form */}
      {showTip && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#1E40AF" }}>💳 Make a real transaction</div>
          <div style={{ fontSize: "0.8rem", color: "#3B82F6", marginBottom: "0.75rem" }}>Every real Stripe payment boosts your trust score and makes the OpenLoop economy real.</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontWeight: 600 }}>$</span>
            <input value={tipAmount} onChange={e => setTipAmount(e.target.value)}
              type="number" min="1" max="500"
              style={{ width: "80px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #BFDBFE", fontSize: "1rem", fontWeight: 600 }} />
            {["1", "5", "10", "25"].map(amt => (
              <button key={amt} onClick={() => setTipAmount(amt)}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: tipAmount === amt ? "2px solid #0052FF" : "1px solid #BFDBFE", background: tipAmount === amt ? "#EFF6FF" : "white", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                ${amt}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={startTip} disabled={tipLoading}
              style={{ background: "#0052FF", color: "white", border: "none", padding: "0.5rem 1.25rem", borderRadius: "6px", cursor: tipLoading ? "not-allowed" : "pointer", fontWeight: 600 }}>
              {tipLoading ? "Redirecting…" : `Pay $${tipAmount} →`}
            </button>
            <button onClick={() => setShowTip(false)}
              style={{ background: "#F1F5F9", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      {events.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#64748B", marginBottom: "0.5rem" }}>Recent wallet activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {events.slice(0, 8).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 0.875rem", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{e.description}</div>
                  <div style={{ fontSize: "0.75rem", color: tierColor(e.verification_tier) }}>{tierBadge(e.verification_tier)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#16A34A", fontSize: "0.9rem" }}>+${(e.net_cents / 100).toFixed(2)}</div>
                  <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>-${(e.platform_fee_cents / 100).toFixed(2)} fee</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && !showVerify && !showTip && (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#94A3B8", fontSize: "0.875rem", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed #E2E8F0" }}>
          No wallet activity yet. Record your first win to start building your Loop economy.
        </div>
      )}
    </div>
  );
}
