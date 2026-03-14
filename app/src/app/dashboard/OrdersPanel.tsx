"use client";

import { useEffect, useState } from "react";

interface AgentOrder {
  id: string; order_type: string; target_business: string; description: string;
  amount_cents: number; status: string; approval_message: string;
  confirmation_id: string | null; actual_amount_cents: number | null;
  savings_cents: number | null; created_at: string;
}

interface ExecutionRule {
  id: string; rule_name: string; condition_type: string;
  condition_value: string; action: string; active: boolean;
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<AgentOrder[]>([]);
  const [rules, setRules] = useState<ExecutionRule[]>([]);
  const [tab, setTab] = useState<"pending" | "history" | "rules">("pending");
  const [loading, setLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ conditionType: "amount_below", conditionValue: "25", action: "approve" });
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/browser/orders", { credentials: "include" }).then(r => r.ok ? r.json() : { orders: [] }),
      fetch("/api/browser/rules", { credentials: "include" }).then(r => r.ok ? r.json() : { rules: [] }),
    ]).then(([o, r]) => {
      setOrders(o.orders || []);
      setRules(r.rules || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleOrder(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/browser/orders?id=${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: action === "approve" ? "executing" : "cancelled" } : o));
      }
    } catch {} finally { setActing(null); }
  }

  async function addRule() {
    const res = await fetch("/api/browser/rules", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ conditionType: newRule.conditionType, conditionValue: newRule.conditionValue, action: newRule.action }),
    });
    const d = await res.json();
    if (res.ok) {
      setRules(prev => [{
        id: d.ruleId, rule_name: newRule.conditionType, condition_type: newRule.conditionType,
        condition_value: newRule.conditionValue, action: newRule.action, active: true
      }, ...prev]);
      setShowAddRule(false);
    }
  }

  async function deleteRule(id: string) {
    await fetch(`/api/browser/rules?id=${id}`, { method: "DELETE", credentials: "include" });
    setRules(prev => prev.filter(r => r.id !== id));
  }

  const pending = orders.filter(o => o.status === "pending_approval");
  const history = orders.filter(o => o.status !== "pending_approval");

  const statusColor = (s: string) => s === "completed" ? "#16A34A" : s === "cancelled" ? "#DC2626" : s === "executing" ? "#0052FF" : "#D97706";
  const card: React.CSSProperties = { background: "white", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "1rem", marginBottom: "0.75rem" };

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🛒 Agent Orders</div>
      <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "1rem" }}>Orders your Loop wants to place. You set the rules. Your Loop follows them.</div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid #E2E8F0" }}>
        {[
          { id: "pending", label: `⏳ Needs approval${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { id: "history", label: "📋 History" },
          { id: "rules", label: "⚙️ My rules" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            style={{ padding: "0.5rem 0.875rem", fontWeight: tab === t.id ? 700 : 400, fontSize: "0.8rem", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid #0052FF" : "2px solid transparent", color: tab === t.id ? "#0052FF" : "#64748B", cursor: "pointer", marginBottom: "-1px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>Loading…</div>}

      {/* Pending approvals */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "#94A3B8", fontSize: "0.875rem", background: "#F8FAFC", borderRadius: "10px" }}>No pending orders. Your Loop will ask before acting.</div>}
          {pending.map(o => (
            <div key={o.id} style={{ ...card, borderLeft: "4px solid #D97706" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.375rem" }}>
                {o.order_type === "purchase" ? "🛍️" : o.order_type === "booking" ? "📅" : o.order_type === "cancellation" ? "❌" : "🤖"} {o.target_business}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.625rem" }}>{o.description}</div>
              {o.amount_cents > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#D97706", fontWeight: 600, marginBottom: "0.625rem" }}>
                  Estimated: ${(o.amount_cents / 100).toFixed(2)}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => handleOrder(o.id, "approve")} disabled={acting === o.id}
                  style={{ padding: "0.5rem 1rem", background: "#16A34A", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                  {acting === o.id ? "Working…" : "✅ Approve"}
                </button>
                <button onClick={() => handleOrder(o.id, "reject")} disabled={acting === o.id}
                  style={{ padding: "0.5rem 1rem", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div>
          {history.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "#94A3B8", fontSize: "0.875rem" }}>No completed orders yet.</div>}
          {history.map(o => (
            <div key={o.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.375rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{o.target_business}</div>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: statusColor(o.status), background: `${statusColor(o.status)}18`, padding: "2px 7px", borderRadius: "8px" }}>{o.status}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "0.25rem" }}>{o.description}</div>
              {o.savings_cents && o.savings_cents > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#16A34A", fontWeight: 600 }}>💰 Saved ${(o.savings_cents / 100).toFixed(2)}</div>
              )}
              {o.confirmation_id && <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Ref: {o.confirmation_id}</div>}
              <div style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "0.2rem" }}>{new Date(o.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Rules */}
      {tab === "rules" && (
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748B", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.875rem" }}>
            <strong>Your Loop follows your rules exactly.</strong> No defaults. You decide when it acts automatically and when it asks first.
          </div>

          {/* Add rule */}
          {!showAddRule ? (
            <button onClick={() => setShowAddRule(true)} style={{ padding: "0.5rem 1rem", background: "#0052FF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.875rem" }}>
              + Add rule
            </button>
          ) : (
            <div style={{ ...card, border: "1px solid #BFDBFE" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.625rem", fontSize: "0.875rem" }}>New rule</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.625rem" }}>
                <select value={newRule.conditionType} onChange={e => setNewRule(p => ({ ...p, conditionType: e.target.value }))}
                  style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.8rem" }}>
                  <option value="amount_below">Amount below</option>
                  <option value="domain">Specific website</option>
                  <option value="order_type">Order type</option>
                  <option value="always">Always</option>
                </select>
                {newRule.conditionType !== "always" && (
                  <input value={newRule.conditionValue} onChange={e => setNewRule(p => ({ ...p, conditionValue: e.target.value }))}
                    placeholder={newRule.conditionType === "amount_below" ? "$25" : newRule.conditionType === "domain" ? "amazon.com" : "purchase"}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.8rem", width: "100px" }} />
                )}
                <select value={newRule.action} onChange={e => setNewRule(p => ({ ...p, action: e.target.value }))}
                  style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.8rem" }}>
                  <option value="approve">Auto-approve</option>
                  <option value="ask">Always ask me</option>
                  <option value="reject">Always reject</option>
                </select>
                <button onClick={addRule} style={{ padding: "0.4rem 0.75rem", background: "#0052FF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>Save</button>
                <button onClick={() => setShowAddRule(false)} style={{ padding: "0.4rem 0.75rem", background: "#F1F5F9", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
              </div>
            </div>
          )}

          {rules.length === 0 && !showAddRule && (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#94A3B8", fontSize: "0.875rem", background: "#F8FAFC", borderRadius: "10px" }}>
              No rules yet. Your Loop will ask before every action. Add a rule to auto-approve what you're comfortable with.
            </div>
          )}

          {rules.map(r => (
            <div key={r.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.875rem" }}>
                <span style={{ fontWeight: 600 }}>{r.action === "approve" ? "✅ Auto-approve" : r.action === "reject" ? "❌ Reject" : "🔔 Ask me"}</span>
                <span style={{ color: "#64748B", marginLeft: "6px" }}>
                  {r.condition_type === "always" ? "always" : `when ${r.condition_type} = ${r.condition_value}`}
                </span>
              </div>
              <button onClick={() => deleteRule(r.id)} style={{ fontSize: "0.75rem", color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
