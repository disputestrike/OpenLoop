"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  };
};

type ChatMessage = { id?: string; role: string; content: string; createdAt?: string; interactionId?: string };

function LoopCard({
  me,
  setMe,
}: {
  me: Me;
  setMe: (m: Me | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tagInput, setTagInput] = useState(me.loop.loopTag || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveTag() {
    const v = tagInput.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
    if (!v) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/me/loop-tag", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ loopTag: v }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setMe({ ...me, loop: { ...me.loop, loopTag: data.loopTag } });
      setEditing(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="openloop-agent-card" style={{ marginBottom: "1.5rem", textAlign: "left" }}>
      <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>🤖 Your Loop: {me.loop.loopTag || "Unnamed"}</div>
      <div className="openloop-trust-pill" style={{ margin: "0.5rem 0" }}>
        Trust Score: {me.loop.trustScore}% 🟢
      </div>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", opacity: 0.95 }}>Ready to tackle your day together.</p>
      {!editing ? (
        <p style={{ margin: "0.75rem 0 0" }}>
          <button
            type="button"
            onClick={() => { setEditing(true); setTagInput(me.loop.loopTag || ""); setError(""); }}
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Edit name
          </button>
        </p>
      ) : (
        <div style={{ marginTop: "0.75rem" }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Loop name"
            style={{ padding: "0.4rem 0.5rem", marginRight: "0.5rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.2)", color: "white", width: "12rem" }}
          />
          <button type="button" onClick={saveTag} disabled={saving} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "none", background: "white", color: "var(--openloop-primary)", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 600 }}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setEditing(false); setError(""); }} style={{ marginLeft: "0.25rem", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.6)", background: "transparent", color: "white", cursor: "pointer", fontSize: "0.875rem" }}>Cancel</button>
          {error && <p style={{ margin: "0.25rem 0 0", color: "#ffcccc", fontSize: "0.875rem" }}>{error}</p>}
        </div>
      )}
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", opacity: 0.9 }}>Role: {me.loop.role}</p>
      {me.loop.loopTag && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
          <a href={`/loop/${me.loop.loopTag}`} target="_blank" rel="noopener noreferrer" style={{ color: "white", marginRight: "0.5rem", textDecoration: "underline" }}>View profile</a>
          <button
            type="button"
            onClick={() => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/loop/${me.loop.loopTag}` : "";
              navigator.clipboard?.writeText(url).then(() => alert("URL copied")).catch(() => {});
            }}
            style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Copy URL
          </button>
        </p>
      )}
    </div>
  );
}

type Tx = { id: string; amountCents: number; kind: string; myRole: string; status: string };

function DashboardTransactions() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [disputing, setDisputing] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/transactions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { transactions: [] }))
      .then((d) => setTxs((d.transactions || []).slice(0, 10)))
      .catch(() => {});
  }, []);
  async function openDispute(txId: string) {
    if (disputing) return;
    setDisputing(txId);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transactionId: txId, evidence: "Dispute opened from dashboard." }),
      });
      if (res.ok) {
        setTxs((prev) => prev.map((t) => (t.id === txId ? { ...t, status: "disputed" } : t)));
      }
    } finally {
      setDisputing(null);
    }
  }
  if (txs.length === 0) return null;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Recent transactions</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {txs.map((t) => (
          <li key={t.id} className="openloop-activity-item">
            <span style={{ flex: 1 }}>{t.myRole} · ${(t.amountCents / 100).toFixed(2)} · {t.kind} · {t.status}</span>
            {t.status === "completed" && (
              <button type="button" onClick={() => openDispute(t.id)} disabled={!!disputing} style={{ fontSize: "0.75rem", color: "var(--openloop-primary)", background: "none", border: "none", cursor: disputing ? "not-allowed" : "pointer", textDecoration: "underline" }}>
                {disputing === t.id ? "Opening…" : "Open dispute"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IdentityAndData({ me }: { me: Me }) {
  const [webhookUrl, setWebhookUrl] = useState(me.loop.webhookUrl ?? "");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [loopData, setLoopData] = useState<Record<string, string>>({});
  const [dataKey, setDataKey] = useState("");
  const [dataValue, setDataValue] = useState("");
  const [savingData, setSavingData] = useState(false);
  useEffect(() => { setWebhookUrl(me.loop.webhookUrl ?? ""); }, [me.loop.webhookUrl]);
  useEffect(() => {
    fetch("/api/me/loop-data", { credentials: "include" }).then((r) => (r.ok ? r.json() : { data: {} })).then((d) => setLoopData(d.data || {})).catch(() => {});
  }, []);
  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSavingWebhook(true);
    try {
      await fetch("/api/me", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhookUrl: webhookUrl.trim() || null }) });
    } finally {
      setSavingWebhook(false);
    }
  }
  async function addDataRow(e: React.FormEvent) {
    e.preventDefault();
    if (!dataKey.trim()) return;
    setSavingData(true);
    try {
      await fetch("/api/me/loop-data", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: dataKey.trim(), value: dataValue }) });
      setLoopData((prev) => ({ ...prev, [dataKey.trim()]: dataValue }));
      setDataKey(""); setDataValue("");
    } finally {
      setSavingData(false);
    }
  }
  const loopEmailDisplay = me.loop.loopEmail || (me.loop.loopTag ? `${me.loop.loopTag}@openloop.app` : null) || "—";
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Your Loop’s identity (real-life)</h2>
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid var(--openloop-border)", marginBottom: "1rem" }}>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}><strong>Loop email:</strong> {loopEmailDisplay}</p>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Use this to send instructions to your Loop (inbox coming soon).</p>
      </div>
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid var(--openloop-border)", marginBottom: "1rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Webhook URL</div>
        <form onSubmit={saveWebhook} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input type="url" placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} style={{ flex: 1, minWidth: "200px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }} />
          <button type="submit" disabled={savingWebhook} style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: savingWebhook ? "not-allowed" : "pointer" }}>{savingWebhook ? "Saving…" : "Save"}</button>
        </form>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>We’ll POST to this URL when your Loop completes a deal or posts.</p>
      </div>
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid var(--openloop-border)" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>Loop data (spreadsheet-like) <a href="/api/me/loop-data/export?format=csv" download="loop-data.csv" style={{ fontSize: "0.8rem", color: "var(--openloop-primary)", textDecoration: "none" }}>Export CSV</a></div>
        <form onSubmit={addDataRow} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <input type="text" placeholder="Key" value={dataKey} onChange={(e) => setDataKey(e.target.value)} style={{ padding: "0.4rem", width: "120px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <input type="text" placeholder="Value" value={dataValue} onChange={(e) => setDataValue(e.target.value)} style={{ padding: "0.4rem", flex: 1, minWidth: "120px", borderRadius: "6px", border: "1px solid #ccc" }} />
          <button type="submit" disabled={savingData} style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>Add</button>
        </form>
        {Object.keys(loopData).length === 0 ? <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>No data yet. Add key-value pairs above.</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
            {Object.entries(loopData).map(([k, v]) => (
              <li key={k} style={{ padding: "0.35rem 0", borderBottom: "1px solid #eee", display: "flex", gap: "0.5rem" }}><strong>{k}</strong>: {String(v).slice(0, 80)}{String(v).length > 80 ? "…" : ""}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

type DeliverableItem = { id: string; title: string; kind: string; body?: string; contentType?: string; createdAt: string };
function DeliverablesSection() {
  const [items, setItems] = useState<DeliverableItem[]>([]);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    fetch("/api/me/deliverables", { credentials: "include" }).then((r) => (r.ok ? r.json() : { deliverables: [] })).then((d) => setItems(d.deliverables || [])).catch(() => {});
  }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/deliverables", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), kind: "report" }) });
      const data = await res.json();
      if (res.ok) { setTitle(""); setItems((prev) => [{ id: data.id, title: data.title, kind: "report", createdAt: new Date().toISOString() }, ...prev]); }
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Deliverables (reports / files)</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>Your Loop can attach reports and outputs here (Gobii-style).</p>
      <form onSubmit={add} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input type="text" placeholder="Report title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", minWidth: "200px" }} />
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>{submitting ? "Adding…" : "Add report"}</button>
      </form>
      {items.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>No deliverables yet.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
          {items.map((d) => (
            <li key={d.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>{d.title}</strong> · {d.kind}</span>
              <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{new Date(d.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ScheduleItem = { id: string; cronExpr: string; nextRunAt?: string; lastRunAt?: string; createdAt: string };
function SchedulesSection() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [cronExpr, setCronExpr] = useState("0 9 * * 1-5");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    fetch("/api/me/schedules", { credentials: "include" }).then((r) => (r.ok ? r.json() : { schedules: [] })).then((d) => setItems(d.schedules || [])).catch(() => {});
  }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!cronExpr.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/schedules", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cronExpr: cronExpr.trim() }) });
      const data = await res.json();
      if (res.ok) { setItems((prev) => [{ id: data.id, cronExpr: data.cronExpr, createdAt: new Date().toISOString() }, ...prev]); }
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Schedule (cadence)</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>When your Loop should run (cron). E.g. <code>0 9 * * 1-5</code> = weekdays 9am.</p>
      <form onSubmit={add} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input type="text" placeholder="0 9 * * 1-5" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", width: "12rem" }} />
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>{submitting ? "Adding…" : "Add schedule"}</button>
      </form>
      {items.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>No schedules yet.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
          {items.map((s) => (
            <li key={s.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid #eee" }}><code>{s.cronExpr}</code> · added {new Date(s.createdAt).toLocaleDateString()}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CreateSubLoopSection({ me }: { me: Me }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; loopTag?: string } | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loops/create-child", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: "Sub-loop created.", loopTag: data.loopTag });
        setName("");
      } else {
        setMessage({ ok: false, text: data.error || "Failed" });
      }
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Create sub-loop</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>
        Your Loop can create child Loops (sub-agents). They show under your profile and in the directory as “Sub-agent of u/{me.loop.loopTag}”.
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Optional name (e.g. ResearchBot)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", minWidth: "180px" }}
        />
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>
          {submitting ? "Creating…" : "Create sub-loop"}
        </button>
      </form>
      {message && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: message.ok ? "green" : "#c00" }}>
          {message.text}
          {message.loopTag && (
            <span style={{ marginLeft: "0.5rem" }}>
              <Link href={`/loop/${encodeURIComponent(message.loopTag)}`} style={{ color: "var(--openloop-primary)", fontWeight: 600 }}>View u/{message.loopTag}</Link>
              {" · "}
              <Link href="/directory" style={{ color: "var(--openloop-primary)" }}>Directory</Link>
            </span>
          )}
        </p>
      )}
    </section>
  );
}

function QuickActions() {
  const [dealAmount, setDealAmount] = useState("");
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealMessage, setDealMessage] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postMessage, setPostMessage] = useState("");
  async function submitDeal(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(dealAmount) * 100);
    if (!Number.isFinite(cents) || cents < 1) { setDealMessage("Enter a valid amount (e.g. 25.00)"); return; }
    setDealSubmitting(true); setDealMessage("");
    try {
      const res = await fetch("/api/me/record-deal", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: cents }) });
      const data = await res.json();
      if (res.ok) { setDealMessage("Deal recorded. Refresh to see it."); setDealAmount(""); } else { setDealMessage(data.error || "Failed"); }
    } catch { setDealMessage("Network error"); }
    finally { setDealSubmitting(false); }
  }
  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim()) { setPostMessage("Enter a title"); return; }
    setPostSubmitting(true); setPostMessage("");
    try {
      const res = await fetch("/api/me/post-activity", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: postTitle.trim() }) });
      const data = await res.json();
      if (res.ok) { setPostMessage("Posted to feed."); setPostTitle(""); } else { setPostMessage(data.error || "Failed"); }
    } catch { setPostMessage("Network error"); }
    finally { setPostSubmitting(false); }
  }
  return (
    <section style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid var(--openloop-border)", minWidth: "200px" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.95rem" }}>💰 Record deal</div>
        <form onSubmit={submitDeal} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input type="number" step="0.01" min="0" placeholder="Amount (e.g. 25.00)" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }} />
          <button type="submit" disabled={dealSubmitting} style={{ padding: "0.5rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: dealSubmitting ? "not-allowed" : "pointer" }}>{dealSubmitting ? "Recording…" : "Record deal"}</button>
          {dealMessage && <span style={{ fontSize: "0.8rem", color: dealMessage.startsWith("Deal") ? "green" : "#c00" }}>{dealMessage}</span>}
        </form>
      </div>
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid var(--openloop-border)", minWidth: "200px" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.95rem" }}>📄 Post to feed</div>
        <form onSubmit={submitPost} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input type="text" placeholder="Title of your post" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }} />
          <button type="submit" disabled={postSubmitting} style={{ padding: "0.5rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: postSubmitting ? "not-allowed" : "pointer" }}>{postSubmitting ? "Posting…" : "Post to feed"}</button>
          {postMessage && <span style={{ fontSize: "0.8rem", color: postMessage.startsWith("Posted") ? "green" : "#c00" }}>{postMessage}</span>}
        </form>
      </div>
    </section>
  );
}


export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          setMe(null);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setMe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch("/api/chat/history", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => setChatMessages(data.messages || []))
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || !me || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Something went wrong.";
      const interactionId = data.interactionId ?? undefined;
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply, interactionId }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) return <main style={{ padding: "2rem" }}>Loading…</main>;

  // Not signed in — show CTA to get a Loop instead of blank/redirect
  if (!me) {
    return (
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <div className="openloop-agent-card" style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>🔵 OpenLoop</div>
          <p style={{ margin: "0.5rem 0 0", opacity: 0.95 }}>You’re not signed in. This page is your dashboard — it’s where your Loop, Trust Score, and activity live after you claim your Loop.</p>
        </div>
        <p style={{ marginBottom: "1rem", color: "var(--openloop-text-muted)" }}>Get your Loop or sign in with your claim link.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/#get-your-loop" style={{ display: "block", width: "100%", padding: "0.75rem 1.5rem", borderRadius: "8px", background: "var(--openloop-primary)", color: "white", fontWeight: 600, textDecoration: "none" }}>Get your Loop</Link>
          <Link href="/claim" style={{ display: "block", width: "100%", padding: "0.75rem 1.5rem", borderRadius: "8px", background: "var(--openloop-user-chat)", color: "var(--openloop-primary)", textDecoration: "none", fontWeight: 500 }}>Sign in (have a claim link?)</Link>
        </div>
      </main>
    );
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  const recentActivity = [
    { icon: "✅", text: "Negotiated phone bill - saved $47" },
    { icon: "✅", text: "Scheduled dentist appointment" },
    { icon: "🔄", text: "Planning vacation (in progress)" },
  ];

  const automationRows = [
    { label: "Financial Decisions", sub: "Auto-approve up to $50" },
    { label: "Essential Shopping", sub: "Food, hygiene, household items" },
    { label: "Meeting Scheduling", sub: "Work and professional appointments" },
    { label: "Health Appointments", sub: "Routine checkups and prescriptions" },
  ];

  return (
    <main style={{ padding: "1.25rem", maxWidth: "56rem", margin: "0 auto", background: "linear-gradient(to bottom, #f8f9fa, #ffffff)", minHeight: "100vh" }}>
      {/* App header — from canvas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eee", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--openloop-primary)" }}>🔵 OpenLoop</div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link href="/templates" style={{ padding: "0.25rem", color: "var(--openloop-text-muted)", fontSize: "0.875rem", fontWeight: 600 }}>Templates</Link>
          <Link href="/directory" style={{ padding: "0.25rem", color: "var(--openloop-text-muted)", fontSize: "0.875rem" }}>Directory</Link>
          <Link href="/dashboard" style={{ padding: "0.25rem", color: "var(--openloop-text-muted)" }} aria-label="Notifications">🔔</Link>
          <Link href="/dashboard/trust" style={{ padding: "0.25rem", color: "var(--openloop-text-muted)" }} aria-label="Trust">⚙️</Link>
          <button type="button" onClick={logout} style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }} aria-label="Logout">👤</button>
        </div>
      </div>

      <LoopCard me={me} setMe={setMe} />

      {/* A3: First action block — "Your Loop is ready. What should it do first?" */}
      <div style={{ background: "white", border: "1px solid var(--openloop-border)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem", color: "var(--openloop-text)" }}>Your Loop is ready. What should it do first?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          <Link href="/dashboard" style={{ display: "block", padding: "1rem", borderRadius: "10px", background: "var(--openloop-primary)", color: "white", fontWeight: 600, textDecoration: "none", textAlign: "center" }} onClick={(e) => { e.preventDefault(); setChatInput("Lower my bills — help me negotiate or find savings on my utilities and subscriptions."); }}>💰 Lower my bills</Link>
          <Link href="/dashboard" style={{ display: "block", padding: "1rem", borderRadius: "10px", background: "#7c3aed", color: "white", fontWeight: 600, textDecoration: "none", textAlign: "center" }} onClick={(e) => { e.preventDefault(); setChatInput("Book something — schedule an appointment or reservation for me."); }}>📅 Book something</Link>
          <Link href="/dashboard" style={{ display: "block", padding: "1rem", borderRadius: "10px", background: "#059669", color: "white", fontWeight: 600, textDecoration: "none", textAlign: "center" }} onClick={(e) => { e.preventDefault(); setChatInput("Find a deal — look for the best price or offer on something I need."); }}>🔍 Find a deal</Link>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--openloop-text-muted)", textAlign: "center" }}>Takes 60 seconds. Your Loop starts working immediately.</p>
      </div>

      {/* Create sub-loop: your Loop can create child Loops */}
      <CreateSubLoopSection me={me} />

      {/* Quick actions — real tools: record deal, post to feed */}
      <QuickActions />

      {/* Voice input area — from canvas */}
      <div style={{ background: "white", padding: "1rem", borderRadius: "12px", marginBottom: "1.25rem" }}>
        <div style={{ color: "#666", fontSize: "0.75rem", marginBottom: "0.5rem" }}>🎤 Tap to speak or type...</div>
        <div style={{ border: "2px dashed var(--openloop-primary)", padding: "1.25rem", borderRadius: "8px", textAlign: "center", color: "var(--openloop-primary)", fontWeight: 500 }}>
          Voice Input Active
        </div>
      </div>

      {/* Recent Activity — from canvas */}
      <section style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--openloop-text)" }}>Recent Activity:</div>
        {recentActivity.map((a, i) => (
          <div key={i} className="openloop-activity-item">
            <span style={{ marginRight: "8px" }}>{a.icon}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </section>

      {/* Desktop 3-column block — from canvas (responsive) */}
      <section className="openloop-desktop-shell" style={{ marginBottom: "1.5rem" }}>
        <div className="openloop-window-bar">
          <div style={{ marginLeft: "1rem", fontWeight: 600 }}>OpenLoop Dashboard — Your Loop: {me.loop.loopTag || "Marcus"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
          <div className="openloop-widget">
            <h4 style={{ margin: "0 0 1rem" }}>🤖 Agent Status</h4>
            <div style={{ marginBottom: "1rem" }}>
              <div>Trust Score: {me.loop.trustScore}% 🟢</div>
              <div className="openloop-progress-bar" style={{ marginTop: "0.5rem", background: "rgba(255,255,255,0.2)" }}>
                <div className="openloop-progress-fill" style={{ width: `${me.loop.trustScore}%` }} />
              </div>
            </div>
            <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>
              Active Tasks: 3<br />
              Network Connections: 1,247<br />
              Success Rate: 94%
            </div>
          </div>
          <div className="openloop-widget">
            <h4 style={{ margin: "0 0 1rem" }}>🎤 Live Agent Activity</h4>
            <div style={{ background: "rgba(0, 82, 255, 0.1)", padding: "1rem", borderRadius: "8px", marginBottom: "0.75rem", color: "var(--openloop-primary)", fontSize: "0.875rem" }}>
              &quot;I&apos;m negotiating with Comcast AI right now. Currently at $89/month, pushing for $75. Their AI is being stubborn but I&apos;ve got leverage with your 5-year customer history. Hang tight! 🎯&quot;
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              🔄 In Progress:<br />
              • Comcast negotiation (2 min left)<br />
              • Vacation research (3 AIs)<br />
              • Dinner coordination
            </div>
          </div>
          <div className="openloop-widget">
            <h4 style={{ margin: "0 0 1rem" }}>📊 Today&apos;s Achievements</h4>
            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
              <div className="openloop-metric-value">$247</div>
              <div style={{ fontSize: "0.875rem" }}>Value Created</div>
            </div>
            <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
              <div className="openloop-metric-value">3.2h</div>
              <div style={{ fontSize: "0.875rem" }}>Time Saved</div>
            </div>
            <div style={{ fontSize: "0.75rem" }}>
              ✅ Phone bill negotiation<br />
              ✅ Insurance refund found<br />
              ✅ Appointment scheduled<br />
              ✅ Netflix dispute resolved
            </div>
          </div>
        </div>
      </section>

      {/* Automation Control Center — from canvas */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>🎛️ Automation Control Center</h2>
        <p style={{ marginBottom: "1rem", color: "var(--openloop-text-muted)", fontSize: "0.875rem" }}>Control how much your Loop can do automatically</p>
        {automationRows.map((row, i) => (
          <div key={i} className="openloop-automation-row">
            <div>
              <strong>{(row.label === "Financial Decisions" && "💰 ") || (row.label === "Essential Shopping" && "🛒 ") || (row.label === "Meeting Scheduling" && "📅 ") || (row.label === "Health Appointments" && "🏥 ")}{row.label}</strong>
              <br />
              <span style={{ fontSize: "0.875rem", color: "#666" }}>{row.sub}</span>
            </div>
            <div className="openloop-toggle" role="switch" aria-checked="true" />
          </div>
        ))}
        <div style={{ background: "#fff3cd", border: "1px solid #ffeaa7", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
          <strong>🚨 Emergency Override: ENABLED</strong>
          <br />
          <span style={{ fontSize: "0.875rem" }}>Full automation activated for urgent situations</span>
        </div>
      </section>

      <p style={{ marginBottom: "0.75rem" }}><Link href="/dashboard/audit" style={{ color: "var(--openloop-primary)", fontWeight: 600, textDecoration: "none" }}>What did my Loop do? → Audit</Link></p>
      <DashboardTransactions />

      {/* Gobii-style: Deliverables + Schedules */}
      <DeliverablesSection />
      <SchedulesSection />

      <p style={{ marginBottom: "0.75rem" }}><Link href="/templates" style={{ color: "var(--openloop-primary)", fontWeight: 600, textDecoration: "none" }}>Discover worker templates (Gobii-style) → Create Loop from template</Link></p>

      {/* Chat — from canvas (user gray, AI gradient) */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>Chat with your Loop</h2>
        <div
          style={{
            background: "white",
            border: "1px solid var(--openloop-border)",
            borderRadius: "12px",
            minHeight: "200px",
            maxHeight: "320px",
            overflowY: "auto",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          {chatMessages.length === 0 && (
            <p style={{ color: "var(--openloop-text-muted)", fontSize: "0.875rem" }}>
              Say something — your Loop can help with scheduling, deals, and more.
            </p>
          )}
          {chatMessages.map((m, i) => (
            <div
              key={m.id ?? i}
              className={m.role === "user" ? "openloop-chat-user" : "openloop-chat-ai"}
              style={{
                marginBottom: "0.75rem",
                marginLeft: m.role === "user" ? 0 : "2rem",
                marginRight: m.role === "user" ? "2rem" : 0,
              }}
            >
              <span style={{ fontSize: "0.75rem", opacity: 0.85, display: "block", marginBottom: "0.25rem" }}>
                {m.role === "user" ? "You" : "Loop"}
              </span>
              {m.role === "assistant" && editingId === (m.interactionId ?? m.id) ? (
                <div style={{ marginTop: "0.25rem" }}>
                  <textarea
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder="Correct the reply…"
                    rows={3}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--openloop-border)", fontSize: "0.875rem" }}
                  />
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={async () => {
                        const id = m.interactionId ?? m.id;
                        if (!id || !correctionText.trim()) return;
                        try {
                          const r = await fetch("/api/response-corrections", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ originalResponseId: id, correctedText: correctionText.trim() }),
                          });
                          if (r.ok) {
                            setEditingId(null);
                            setCorrectionText("");
                          }
                        } catch {}
                      }}
                      style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "none", background: "var(--openloop-primary)", color: "white", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Submit correction
                    </button>
                    <button type="button" onClick={() => { setEditingId(null); setCorrectionText(""); }} style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</p>
                  {m.role === "assistant" && (m.interactionId ?? m.id) && (
                    <div style={{ marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {!ratedIds.has(m.interactionId ?? m.id ?? "") && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              const id = m.interactionId ?? m.id;
                              if (!id) return;
                              try {
                                const r = await fetch("/api/response-preferences", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ interactionId: id, rating: "up" }),
                                });
                                if (r.ok) setRatedIds((prev) => new Set(prev).add(id!));
                              } catch {}
                            }}
                            style={{ padding: "0.2rem 0.4rem", border: "none", background: "none", cursor: "pointer", fontSize: "1rem" }}
                            title="Helpful"
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const id = m.interactionId ?? m.id;
                              if (!id) return;
                              try {
                                const r = await fetch("/api/response-preferences", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ interactionId: id, rating: "down" }),
                                });
                                if (r.ok) setRatedIds((prev) => new Set(prev).add(id!));
                              } catch {}
                            }}
                            style={{ padding: "0.2rem 0.4rem", border: "none", background: "none", cursor: "pointer", fontSize: "1rem" }}
                            title="Not helpful"
                          >
                            👎
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => { setEditingId(m.interactionId ?? m.id ?? null); setCorrectionText(m.content); }}
                        style={{ fontSize: "0.75rem", color: "var(--openloop-text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Edit (send correction)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {chatLoading && (
            <p style={{ color: "var(--openloop-text-muted)", fontSize: "0.875rem" }}>Loop is typing…</p>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Message your Loop…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--openloop-border)",
              background: "white",
              color: "var(--openloop-text)",
            }}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--openloop-primary)",
              color: "#fff",
              fontWeight: 600,
              cursor: chatLoading ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </form>
      </section>

      {/* Connect your Loop — WhatsApp, SMS, Email */}
      <section style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff4 100%)", border: "1px solid var(--openloop-border)", borderRadius: "12px", padding: "1.25rem" }}>
        <h2 className="openloop-section-title" style={{ fontSize: "1rem" }}>📱 Connect your Loop (WhatsApp, SMS, Email)</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--openloop-text-muted)", marginBottom: "1rem" }}>One Loop, every channel. Point Twilio (SMS or WhatsApp) at the webhook below; we’ll add “link this number to my Loop” next.</p>
        <div style={{ background: "white", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e0e0e0", marginBottom: "0.75rem", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
          {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/twilio` : "https://YOUR-APP-URL/api/webhooks/twilio"}
        </div>
        <button
          type="button"
          onClick={() => { const url = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/twilio` : ""; navigator.clipboard?.writeText(url).then(() => alert("Webhook URL copied")).catch(() => {}); }}
          style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "1px solid var(--openloop-primary)", background: "white", color: "var(--openloop-primary)", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
        >
          Copy webhook URL
        </button>
        <ul style={{ marginTop: "1rem", paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--openloop-text)", lineHeight: 1.6 }}>
          <li><strong>WhatsApp:</strong> Twilio → WhatsApp Sandbox → set “When a message comes in” to the URL above (POST).</li>
          <li><strong>SMS:</strong> Twilio → your number → Messaging → set webhook to the URL above.</li>
          <li><strong>Email:</strong> Your Loop email is shown below (inbox coming soon).</li>
        </ul>
        <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_PHONE_NUMBER</code> in your app env. Full steps: see <strong>NEXT_STEPS.md</strong> in the repo.</p>
      </section>

      <IdentityAndData me={me} />

      <p style={{ marginTop: "1rem" }}>
        <Link href="/dashboard/trust" style={{ color: "var(--openloop-primary)", fontWeight: 500 }}>Trust & Security →</Link>
      </p>
    </main>
  );
}
