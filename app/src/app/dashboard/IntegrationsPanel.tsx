"use client";

import { useEffect, useState } from "react";

interface Integration {
  id: string; integration_name: string; webhook_url: string;
  trigger_events: string[]; active: boolean;
  last_triggered_at: string | null; trigger_count: number;
}

interface AvailableEvent { id: string; label: string; desc: string; }

const PRESETS = [
  { name: "n8n (self-hosted)", url: "", placeholder: "https://your-n8n.up.railway.app/webhook/openloop", icon: "⚡" },
  { name: "Zapier", url: "", placeholder: "https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy/", icon: "⚡" },
  { name: "Make (Integromat)", url: "", placeholder: "https://hook.eu1.make.com/xxxxx", icon: "🔗" },
  { name: "Slack", url: "", placeholder: "https://hooks.slack.com/services/xxx/yyy/zzz", icon: "💬" },
  { name: "Custom webhook", url: "", placeholder: "https://your-server.com/webhook", icon: "🔧" },
];

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["deal_completed", "win_recorded"]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [preset, setPreset] = useState(0);

  useEffect(() => {
    fetch("/api/integrations", { credentials: "include" })
      .then(r => r.ok ? r.json() : { integrations: [], availableEvents: [] })
      .then(d => { setIntegrations(d.integrations || []); setAvailableEvents(d.availableEvents || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function addIntegration() {
    if (!name || !webhookUrl || selectedEvents.length === 0) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ integrationName: name, webhookUrl, triggerEvents: selectedEvents }),
      });
      const d = await res.json();
      if (res.ok) {
        setSaveMsg(d.message || "✅ Connected!");
        setIntegrations(prev => [{
          id: d.integrationId, integration_name: name, webhook_url: webhookUrl,
          trigger_events: selectedEvents, active: true, last_triggered_at: null, trigger_count: 0
        }, ...prev]);
        setName(""); setWebhookUrl(""); setSelectedEvents(["deal_completed", "win_recorded"]);
        setShowAdd(false);
      } else setSaveMsg(d.error || "Failed");
    } catch { setSaveMsg("Network error"); } finally { setSaving(false); }
  }

  async function toggleIntegration(id: string, active: boolean) {
    await fetch(`/api/integrations?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ active }) });
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, active } : i));
  }

  async function deleteIntegration(id: string) {
    await fetch(`/api/integrations?id=${id}`, { method: "DELETE", credentials: "include" });
    setIntegrations(prev => prev.filter(i => i.id !== id));
  }

  function toggleEvent(eventId: string) {
    setSelectedEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
  }

  const card: React.CSSProperties = { background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "1rem", marginBottom: "0.75rem" };

  if (loading) return <div style={{ color: "#94A3B8", fontSize: "0.875rem", padding: "1rem" }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>🔗 Integrations</div>
          <div style={{ fontSize: "0.8rem", color: "#64748B" }}>Connect your Loop to Zapier (5000+ apps), n8n (400+), Slack, Make</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
          + Connect
        </button>
      </div>

      {/* n8n callout */}
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1rem", fontSize: "0.8rem" }}>
        <span style={{ fontWeight: 700, color: "#15803D" }}>💡 Zapier & n8n</span>
        <span style={{ color: "#16A34A", marginLeft: "6px" }}>Zapier: 5000+ apps (Webhooks by Zapier). n8n: free, self-hosted, 400+ nodes. Both use the webhook URL above.</span>
      </div>

      {/* Add integration form */}
      {showAdd && (
        <div style={{ ...card, border: "1px solid #BFDBFE", background: "#F8FAFF" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>New integration</div>

          {/* Preset selector */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => { setPreset(i); setName(p.name); }}
                style={{ padding: "0.3rem 0.625rem", borderRadius: "6px", border: preset === i ? "2px solid #0052FF" : "1px solid #E2E8F0", background: preset === i ? "#EFF6FF" : "white", color: preset === i ? "#0052FF" : "#64748B", cursor: "pointer", fontSize: "0.75rem", fontWeight: preset === i ? 600 : 400 }}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>

          <input value={name} onChange={e => setName(e.target.value)} placeholder="Integration name"
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.875rem", marginBottom: "0.5rem", boxSizing: "border-box" as const }} />
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder={PRESETS[preset]?.placeholder || "https://your-webhook-url"}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.875rem", marginBottom: "0.75rem", boxSizing: "border-box" as const, fontFamily: "monospace" }} />

          <div style={{ fontWeight: 600, fontSize: "0.8rem", marginBottom: "0.4rem" }}>Trigger on:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.875rem" }}>
            {availableEvents.map(e => (
              <button key={e.id} onClick={() => toggleEvent(e.id)}
                style={{ padding: "0.25rem 0.625rem", borderRadius: "6px", border: selectedEvents.includes(e.id) ? "2px solid #0052FF" : "1px solid #E2E8F0", background: selectedEvents.includes(e.id) ? "#EFF6FF" : "white", color: selectedEvents.includes(e.id) ? "#0052FF" : "#64748B", cursor: "pointer", fontSize: "0.75rem", fontWeight: selectedEvents.includes(e.id) ? 600 : 400 }}
                title={e.desc}>
                {e.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={addIntegration} disabled={!name || !webhookUrl || selectedEvents.length === 0 || saving}
              style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
              {saving ? "Connecting…" : "Connect & Test →"}
            </button>
            <button onClick={() => { setShowAdd(false); setSaveMsg(""); }}
              style={{ padding: "0.5rem 1rem", background: "#F1F5F9", color: "#0F172A", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
              Cancel
            </button>
          </div>
          {saveMsg && <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: saveMsg.includes("✅") ? "#16A34A" : "#DC2626" }}>{saveMsg}</div>}
        </div>
      )}

      {/* Existing integrations */}
      {integrations.length === 0 && !showAdd && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94A3B8", fontSize: "0.875rem", background: "#F8FAFC", borderRadius: "10px" }}>
          No integrations yet. Connect n8n to fire your Loop's events into any app.
        </div>
      )}

      {integrations.map(i => (
        <div key={i.id} style={{ ...card, opacity: i.active ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{i.integration_name}</span>
              {!i.active && <span style={{ marginLeft: "8px", fontSize: "0.7rem", color: "#94A3B8" }}>paused</span>}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button onClick={() => toggleIntegration(i.id, !i.active)}
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", border: "1px solid #E2E8F0", borderRadius: "6px", background: "white", cursor: "pointer", color: "#64748B" }}>
                {i.active ? "Pause" : "Resume"}
              </button>
              <button onClick={() => deleteIntegration(i.id)}
                style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", border: "1px solid #FECACA", borderRadius: "6px", background: "#FEF2F2", cursor: "pointer", color: "#DC2626" }}>
                Remove
              </button>
            </div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#94A3B8", marginBottom: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.webhook_url}
          </div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {i.trigger_events.map(e => (
              <span key={e} style={{ fontSize: "0.7rem", padding: "1px 6px", background: "#EFF6FF", color: "#0052FF", borderRadius: "6px", fontWeight: 500 }}>{e}</span>
            ))}
          </div>
          <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#94A3B8" }}>
            {i.trigger_count} triggers{i.last_triggered_at ? ` · last: ${new Date(i.last_triggered_at).toLocaleDateString()}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
