"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WalletPanel from "./WalletPanel";
import FirstActionPrompt from "./FirstActionPrompt";
import LoopShareCard from "./LoopShareCard";
import InboxPanel from "./InboxPanel";
import SettingsPanel from "./SettingsPanel";

type Me = {
  humanId: string;
  loop: {
    id: string;
    loopTag: string | null;
    trustScore: number;
    role: string;
    email: string | null;
    loopEmail?: string | null;
    webhookUrl?: string | null;
    persona?: string | null;
    onboardingComplete?: boolean;
  };
};

type ChatMessage = { id?: string; role: string; content: string; createdAt?: string; interactionId?: string };

function LoopCard({ me, setMe }: { me: Me; setMe: (m: Me | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState(me.loop.loopTag || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveTag() {
    const v = tagInput.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    if (!v) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/me/loop-tag", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ loopTag: v }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setMe({ ...me, loop: { ...me.loop, loopTag: data.loopTag } });
      setEditing(false);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const personaEmoji: Record<string, string> = { personal: "🧑", buyer: "🛒", seller: "💼", business: "🏢", general: "🤖" };

  return (
    <div className="openloop-agent-card" style={{ marginBottom: "1.5rem", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>
          {personaEmoji[me.loop.persona || "personal"] || "🤖"} Your Loop: {me.loop.loopTag || "Unnamed"}
        </div>
        {me.loop.onboardingComplete === false && (
          <Link href="/onboarding" style={{ fontSize: "0.75rem", background: "#FEF3C7", color: "#D97706", border: "1px solid #FDE68A", borderRadius: "6px", padding: "3px 8px", textDecoration: "none", fontWeight: 600 }}>
            Complete setup →
          </Link>
        )}
      </div>
      <div className="openloop-trust-pill" style={{ margin: "0.5rem 0" }}>
        Trust Score: {me.loop.trustScore}% 🟢
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <div className="openloop-progress-bar" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="openloop-progress-fill" style={{ width: `${me.loop.trustScore}%` }} />
        </div>
      </div>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", opacity: 0.95 }}>Ready to tackle your day together.</p>
      {!editing ? (
        <p style={{ margin: "0.75rem 0 0" }}>
          <button type="button" onClick={() => { setEditing(true); setTagInput(me.loop.loopTag || ""); setError(""); }}
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Edit name
          </button>
        </p>
      ) : (
        <div style={{ marginTop: "0.75rem" }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="New Loop name"
            style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.875rem" }} />
          <button type="button" onClick={saveTag} disabled={saving}
            style={{ marginLeft: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "none", background: "white", color: "var(--openloop-primary)", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setError(""); }}
            style={{ marginLeft: "0.25rem", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.6)", background: "transparent", color: "white", cursor: "pointer", fontSize: "0.875rem" }}>
            Cancel
          </button>
          {error && <p style={{ color: "#fca5a5", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function PhoneConnect() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "sent" | "linked">("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/link-phone", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.phoneNumber) setLinkedPhone(d.phoneNumber); })
      .catch(() => {});
  }, []);

  async function sendCode() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/me/link-phone", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "send", phone }) });
      const d = await res.json();
      if (res.ok) { setStep("sent"); setMsg(d.message || "Code sent!"); }
      else setMsg(d.error || "Failed");
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  }

  async function verifyCode() {
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/me/link-phone", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action: "verify", phone, code }) });
      const d = await res.json();
      if (res.ok) { setStep("linked"); setLinkedPhone(phone); setMsg(d.message || "Phone linked!"); }
      else setMsg(d.error || "Failed");
    } catch { setMsg("Network error"); } finally { setLoading(false); }
  }

  if (linkedPhone) {
    return (
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
        <span style={{ fontWeight: 600, color: "#15803D" }}>✓ WhatsApp/SMS linked: {linkedPhone}</span>
        <span style={{ fontSize: "0.8rem", color: "#16A34A", marginLeft: "0.5rem" }}>Text your Loop anytime</span>
      </div>
    );
  }

  return (
    <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
      <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#0369A1" }}>📱 Connect WhatsApp / SMS</div>
      <div style={{ fontSize: "0.8rem", color: "#0284C7", marginBottom: "0.75rem" }}>Link your phone number so you can text your Loop anytime — just like texting a person.</div>
      {step === "idle" && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+15551234567"
            style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #BAE6FD", fontSize: "0.875rem" }} />
          <button onClick={sendCode} disabled={!phone || loading}
            style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            {loading ? "Sending…" : "Send Code"}
          </button>
        </div>
      )}
      {step === "sent" && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code"
            style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #BAE6FD", fontSize: "0.875rem" }} />
          <button onClick={verifyCode} disabled={!code || loading}
            style={{ padding: "0.5rem 1rem", background: "#16A34A", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
      )}
      {msg && <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: step === "linked" ? "#16A34A" : msg.includes("sent") ? "#0052FF" : "#DC2626" }}>{msg}</div>}
    </div>
  );
}

function MemoryPanel() {
  const [memories, setMemories] = useState<Array<{ id: string; memory_type: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  function load() {
    if (loading) return;
    setLoading(true);
    fetch("/api/me/memory", { credentials: "include" })
      .then(r => r.ok ? r.json() : { memories: [] })
      .then(d => setMemories(d.memories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function deleteMemory(id: string) {
    await fetch(`/api/me/memory?id=${id}`, { method: "DELETE", credentials: "include" });
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  const typeColor: Record<string, string> = { preference: "#0052FF", fact: "#16A34A", limit: "#DC2626", history: "#64748B" };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <button onClick={() => { setShow(!show); if (!show) load(); }}
        style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0052FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        🧠 Loop Memory {show ? "▲" : "▼"}
      </button>
      {show && (
        <div style={{ marginTop: "0.75rem" }}>
          {loading && <div style={{ fontSize: "0.8rem", color: "#94A3B8" }}>Loading…</div>}
          {!loading && memories.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#94A3B8", padding: "0.75rem", background: "#F8FAFC", borderRadius: "6px" }}>
              No memories yet. Your Loop will learn from every conversation.
            </div>
          )}
          {memories.slice(0, 10).map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "#F8FAFC", borderRadius: "6px", marginBottom: "0.375rem", border: "1px solid #E2E8F0" }}>
              <div>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: typeColor[m.memory_type] || "#64748B", marginRight: "6px" }}>[{m.memory_type}]</span>
                <span style={{ fontSize: "0.8rem" }}>{m.content.slice(0, 80)}{m.content.length > 80 ? "…" : ""}</span>
              </div>
              <button onClick={() => deleteMemory(m.id)}
                style={{ fontSize: "0.75rem", color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          ))}
          {memories.length > 10 && <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>+{memories.length - 10} more memories</div>}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  void router;
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"chat" | "wallet" | "share" | "settings">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => { if (res.status === 401) { setLoading(false); return null; } return res.json(); })
      .then(data => { if (data) setMe(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch("/api/chat/history", { credentials: "include" })
      .then(res => res.ok ? res.json() : { messages: [] })
      .then(data => setChatMessages(data.messages || []))
      .catch(() => {});
  }, [me]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function sendMessage(msg?: string) {
    const text = (msg || chatInput).trim();
    if (!text || !me || chatLoading) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ message: text }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "Something went wrong.", interactionId: data.interactionId }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Network error. Try again." }]);
    } finally { setChatLoading(false); }
  }

  async function handleFormSubmit(e: React.FormEvent) { e.preventDefault(); sendMessage(); }

  async function rate(id: string, rating: "up" | "down") {
    try {
      const r = await fetch("/api/response-preferences", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ interactionId: id, rating }) });
      if (r.ok) setRatedIds(prev => new Set(prev).add(id));
    } catch {}
  }

  async function logout() { await fetch("/api/logout", { method: "POST", credentials: "include" }); window.location.href = "/"; }

  if (loading) return <main style={{ padding: "2rem", textAlign: "center", color: "#94A3B8" }}>Loading your Loop…</main>;

  if (!me) {
    return (
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <div className="openloop-agent-card" style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>🔵 OpenLoop</div>
          <p style={{ margin: "0.5rem 0 0", opacity: 0.95 }}>Sign in with your claim link to access your Loop.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/#get-your-loop" style={{ display: "block", width: "100%", padding: "0.75rem 1.5rem", borderRadius: "8px", background: "var(--openloop-primary)", color: "white", fontWeight: 600, textDecoration: "none" }}>Get your free Loop →</Link>
          <Link href="/claim" style={{ display: "block", width: "100%", padding: "0.75rem 1.5rem", borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", textDecoration: "none", fontWeight: 500 }}>Sign in with claim link</Link>
        </div>
      </main>
    );
  }

  const tabs = [
    { id: "chat", label: "💬 Chat" },
    { id: "wallet", label: "💰 Wallet" },
    { id: "inbox", label: "📥 Inbox" },
    { id: "share", label: "🔗 Share" },
    { id: "settings", label: "⚙️ Settings" },
  ] as const;

  return (
    <main style={{ padding: "1.25rem", maxWidth: "56rem", margin: "0 auto", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid #E2E8F0", marginBottom: "1.25rem" }}>
        <Link href="/" style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--openloop-primary)", textDecoration: "none" }}>🔵 OpenLoop</Link>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link href="/directory" style={{ padding: "0.25rem 0.5rem", color: "#64748B", fontSize: "0.875rem", textDecoration: "none" }}>Directory</Link>
          <Link href="/loop/trending" style={{ padding: "0.25rem 0.5rem", color: "#64748B", fontSize: "0.875rem", textDecoration: "none" }}>Feed</Link>
          <button type="button" onClick={logout} style={{ padding: "0.25rem 0.75rem", background: "#F1F5F9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", color: "#64748B" }}>Sign out</button>
        </div>
      </div>

      {/* Loop Card */}
      <LoopCard me={me} setMe={setMe} />

      {/* First Action Prompt — shown until dismissed */}
      <FirstActionPrompt loopTag={me.loop.loopTag || undefined} onAction={(msg) => { setActiveTab("chat"); sendMessage(msg); }} />

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid #E2E8F0", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "0.625rem 1rem", fontWeight: activeTab === t.id ? 700 : 400, fontSize: "0.875rem", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid #0052FF" : "2px solid transparent", color: activeTab === t.id ? "#0052FF" : "#64748B", cursor: "pointer", marginBottom: "-1px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: CHAT ── */}
      {activeTab === "chat" && (
        <div>
          {/* Chat messages */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "12px", minHeight: "280px", maxHeight: "400px", overflowY: "auto", padding: "1rem", marginBottom: "0.75rem" }}>
            {chatMessages.length === 0 && (
              <p style={{ color: "#94A3B8", fontSize: "0.875rem", textAlign: "center", marginTop: "2rem" }}>
                Your Loop is ready. Click an action above or type anything to get started.
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div key={m.id ?? i}
                className={m.role === "user" ? "openloop-chat-user" : "openloop-chat-ai"}
                style={{ marginBottom: "0.75rem", marginLeft: m.role === "user" ? 0 : "1.5rem", marginRight: m.role === "user" ? "1.5rem" : 0 }}>
                <span style={{ fontSize: "0.7rem", opacity: 0.7, display: "block", marginBottom: "0.2rem" }}>{m.role === "user" ? "You" : me.loop.loopTag || "Loop"}</span>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</p>
                {m.role === "assistant" && m.interactionId && !ratedIds.has(m.interactionId) && (
                  <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => rate(m.interactionId!, "up")} style={{ padding: "0.15rem 0.4rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }} title="Helpful">👍</button>
                    <button onClick={() => rate(m.interactionId!, "down")} style={{ padding: "0.15rem 0.4rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }} title="Not helpful">👎</button>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && <p style={{ color: "#94A3B8", fontSize: "0.875rem", fontStyle: "italic" }}>{me.loop.loopTag || "Loop"} is thinking…</p>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleFormSubmit} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="text" placeholder={`Message ${me.loop.loopTag || "your Loop"}…`}
              value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={chatLoading}
              style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.9rem" }} />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              style={{ padding: "0.75rem 1.25rem", borderRadius: "8px", border: "none", background: "#0052FF", color: "white", fontWeight: 600, cursor: chatLoading ? "not-allowed" : "pointer" }}>
              Send
            </button>
          </form>

          {/* Phone connect inline in chat tab */}
          <div style={{ marginTop: "1.5rem" }}>
            <PhoneConnect />
          </div>
        </div>
      )}

      {/* ── TAB: WALLET ── */}
      {activeTab === "wallet" && (
        <div>
          <WalletPanel />
        </div>
      )}

      {/* ── TAB: INBOX ── */}
      {activeTab === "inbox" && (
        <div>
          <InboxPanel />
        </div>
      )}

      {/* ── TAB: SHARE ── */}
      {activeTab === "share" && (
        <div>
          {me.loop.loopTag && <LoopShareCard loopTag={me.loop.loopTag} />}
          {!me.loop.loopTag && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94A3B8" }}>
              Name your Loop first to get your shareable card.
            </div>
          )}
          <div style={{ marginTop: "1.5rem" }}>
            <MemoryPanel />
          </div>
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {activeTab === "settings" && (
        <SettingsPanel
          loopTag={me.loop.loopTag}
          onboardingComplete={me.loop.onboardingComplete ?? false}
          skillTier={me.loop.skillTier ?? 0}
        />
      )}
    </main>
  );
}
