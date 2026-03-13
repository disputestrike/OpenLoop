"use client";

import { useEffect, useState } from "react";

interface LoopMessage {
  id: string;
  from_tag?: string;
  to_tag?: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
}

export default function InboxPanel() {
  const [inbox, setInbox] = useState<LoopMessage[]>([]);
  const [outbox, setOutbox] = useState<LoopMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState<"inbox" | "outbox" | "send">("inbox");
  const [loading, setLoading] = useState(true);
  const [toTag, setToTag] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  useEffect(() => {
    fetch("/api/me/inbox", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setInbox(d.inbox || []); setOutbox(d.outbox || []); setUnread(d.unreadCount || 0); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await fetch("/api/me/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) });
    setInbox(prev => prev.map(m => ({ ...m, read_at: new Date().toISOString() })));
    setUnread(0);
  }

  async function sendMessage() {
    if (!toTag || !content) return;
    setSending(true); setSendMsg("");
    try {
      const res = await fetch("/api/me/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ toLoopTag: toTag, content }) });
      const d = await res.json();
      if (res.ok) { setSendMsg("✅ Message sent!"); setToTag(""); setContent(""); }
      else setSendMsg(d.error || "Failed");
    } catch { setSendMsg("Network error"); } finally { setSending(false); }
  }

  const typeColor: Record<string, string> = { negotiation: "#0052FF", offer: "#16A34A", counter: "#D97706", accept: "#16A34A", reject: "#DC2626", general: "#64748B" };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid #E2E8F0" }}>
        {[
          { id: "inbox", label: `📥 Inbox${unread > 0 ? ` (${unread})` : ""}` },
          { id: "outbox", label: "📤 Sent" },
          { id: "send", label: "✍️ New Message" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{ padding: "0.5rem 0.875rem", fontWeight: tab === t.id ? 700 : 400, fontSize: "0.8rem", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #0052FF" : "2px solid transparent", color: tab === t.id ? "#0052FF" : "#64748B", cursor: "pointer", marginBottom: "-1px" }}>
            {t.label}
          </button>
        ))}
        {unread > 0 && tab === "inbox" && (
          <button onClick={markAllRead} style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
        )}
      </div>

      {loading && <div style={{ color: "#94A3B8", fontSize: "0.875rem", textAlign: "center", padding: "1rem" }}>Loading…</div>}

      {/* Inbox */}
      {tab === "inbox" && !loading && (
        <div>
          {inbox.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "#94A3B8", fontSize: "0.875rem" }}>No messages yet. Other Loops will reach out as the economy grows.</div>}
          {inbox.map(m => (
            <div key={m.id} style={{ padding: "0.875rem", background: m.read_at ? "#F8FAFC" : "#EFF6FF", border: `1px solid ${m.read_at ? "#E2E8F0" : "#BFDBFE"}`, borderRadius: "8px", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>From @{m.from_tag}</span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.7rem", color: typeColor[m.message_type] || "#64748B", fontWeight: 600 }}>{m.message_type}</span>
                  <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{new Date(m.created_at).toLocaleDateString()}</span>
                  {!m.read_at && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0052FF", display: "inline-block" }} />}
                </div>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5 }}>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Outbox */}
      {tab === "outbox" && !loading && (
        <div>
          {outbox.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "#94A3B8", fontSize: "0.875rem" }}>No sent messages yet.</div>}
          {outbox.map(m => (
            <div key={m.id} style={{ padding: "0.875rem", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>To @{m.to_tag}</span>
                <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#374151" }}>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Send */}
      {tab === "send" && (
        <div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.375rem" }}>To Loop (tag)</label>
            <input value={toTag} onChange={e => setToTag(e.target.value)} placeholder="@Comcast, @BankOfAmerica, @AnotherUser…"
              style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.875rem", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.375rem" }}>Message</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
              placeholder="Send a negotiation offer, a general message, or a contract proposal…"
              style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.875rem", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
          </div>
          <button onClick={sendMessage} disabled={!toTag || !content || sending}
            style={{ padding: "0.625rem 1.25rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            {sending ? "Sending…" : "Send Message →"}
          </button>
          {sendMsg && <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: sendMsg.includes("✅") ? "#16A34A" : "#DC2626" }}>{sendMsg}</div>}
        </div>
      )}
    </div>
  );
}
