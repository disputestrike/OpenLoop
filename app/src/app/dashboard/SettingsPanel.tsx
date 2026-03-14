"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ApiKey { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; }

export default function SettingsPanel({ loopTag, onboardingComplete, skillTier }: {
  loopTag: string | null; onboardingComplete: boolean; skillTier: number;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    if (showKeys) {
      fetch("/api/me/api-key", { credentials: "include" })
        .then(r => r.ok ? r.json() : { keys: [] })
        .then(d => setKeys(d.keys || []))
        .catch(() => {});
    }
  }, [showKeys]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/me/api-key", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: newKeyName }) });
      const d = await res.json();
      if (res.ok) { setNewKey(d.key); setNewKeyName(""); setKeys(prev => [{ id: d.id, name: newKeyName, prefix: d.prefix, created_at: new Date().toISOString(), last_used_at: null }, ...prev]); }
    } catch {} finally { setCreating(false); }
  }

  async function revokeKey(id: string) {
    await fetch(`/api/me/api-key?id=${id}`, { method: "DELETE", credentials: "include" });
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  const card = { background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" };
  const skillLabels = ["Chat only", "Negotiate & Draft", "Act Within Limits", "Full Agent Access"];

  return (
    <div>
      {/* Onboarding status */}
      {!onboardingComplete && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, color: "#92400E", marginBottom: "0.375rem" }}>⚠ Setup incomplete</div>
          <div style={{ fontSize: "0.875rem", color: "#78350F", marginBottom: "0.75rem" }}>Complete your Loop's onboarding to unlock full capabilities and earn your trust score bonus.</div>
          <Link href="/onboarding" style={{ padding: "0.5rem 1rem", background: "#D97706", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>Complete setup →</Link>
        </div>
      )}

      {/* Loop info */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Loop Configuration</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.625rem", fontSize: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ color: "#64748B" }}>Current capability tier</span>
            <span style={{ fontWeight: 600, color: "#0052FF" }}>Tier {skillTier} — {skillLabels[skillTier] || "Unknown"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9" }}>
            <span style={{ color: "#64748B" }}>Loop tag</span>
            <span style={{ fontWeight: 600 }}>@{loopTag || "unnamed"}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem", marginTop: "1rem" }}>
          <Link href="/onboarding" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>⚙️ Change persona, skills, or knowledge base</Link>
          <Link href="/dashboard/trust" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>🛡️ Trust & Security settings</Link>
          <Link href="/dashboard/audit" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>📋 Full audit log</Link>
          <Link href="/businesses" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>🏢 Browse Business Loops to negotiate with</Link>
          <a href="/api/me/loop-data/export?format=csv" download="loop-data.csv" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>📥 Export my Loop data (CSV)</a>
          <a href="/api/me/export" download style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>📤 Export my data (JSON)</a>
          <Link href="/integrations" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>🔌 Integrations</Link>
        </div>
      </div>

      {/* API Keys */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 700 }}>🔑 API Keys</div>
          <button onClick={() => setShowKeys(!showKeys)} style={{ fontSize: "0.8rem", color: "#0052FF", background: "none", border: "none", cursor: "pointer" }}>{showKeys ? "Hide" : "Show"}</button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "0.75rem" }}>Use API keys to access your Loop programmatically or build apps on top of it.</div>
        {showKeys && (
          <div>
            {newKey && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "0.875rem", marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, color: "#15803D", marginBottom: "0.25rem", fontSize: "0.875rem" }}>✅ New key created — save it now</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.8rem", background: "white", padding: "0.5rem", borderRadius: "4px", wordBreak: "break-all" as const, marginBottom: "0.375rem" }}>{newKey}</div>
                <button onClick={() => navigator.clipboard?.writeText(newKey!)} style={{ fontSize: "0.75rem", color: "#16A34A", background: "none", border: "none", cursor: "pointer" }}>Copy key</button>
                <button onClick={() => setNewKey(null)} style={{ fontSize: "0.75rem", color: "#94A3B8", background: "none", border: "none", cursor: "pointer", marginLeft: "0.75rem" }}>Dismiss</button>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. My App)"
                style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.875rem" }} />
              <button onClick={createKey} disabled={!newKeyName || creating}
                style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                {creating ? "Creating…" : "Create Key"}
              </button>
            </div>
            {keys.length === 0 && <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>No API keys yet.</div>}
            {keys.map(k => (
              <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #F1F5F9", fontSize: "0.8rem" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{k.name}</span>
                  <span style={{ color: "#94A3B8", marginLeft: "0.5rem", fontFamily: "monospace" }}>{k.prefix}…</span>
                </div>
                <button onClick={() => revokeKey(k.id)} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp webhook */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>📱 WhatsApp / SMS Webhook</div>
        <div style={{ background: "#F8FAFC", padding: "0.625rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" as const, marginBottom: "0.5rem" }}>
          {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/twilio` : "https://YOUR-URL/api/webhooks/twilio"}
        </div>
        <button onClick={() => { const url = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/twilio` : ""; navigator.clipboard?.writeText(url).then(() => alert("Copied!")); }}
          style={{ padding: "0.375rem 0.75rem", border: "1px solid #0052FF", borderRadius: "6px", background: "white", color: "#0052FF", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
          Copy
        </button>
      </div>
    </div>
  );
}
