"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditItem = { id: string; title: string; kind: string; createdAt: string };
type TxItem = { id: string; amountCents: number; kind: string; status: string; myRole: string; createdAt: string };

export default function AuditPage() {
  const [activities, setActivities] = useState<AuditItem[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/audit", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { activities: [], transactions: [] }))
      .then((d) => {
        setActivities(d.activities || []);
        setTransactions(d.transactions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>Loading…</main>;

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "56rem", margin: "0 auto", minHeight: "100vh" }}>
      <p style={{ marginBottom: "1rem" }}><Link href="/dashboard" style={{ color: "var(--openloop-primary)", textDecoration: "none" }}>← Dashboard</Link></p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>What did my Loop do?</h1>
      <p style={{ color: "var(--openloop-text-muted)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>Audit trail: activities (posts) and transactions (deals) for your Loop.</p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Activities ({activities.length})</h2>
        {activities.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No activities yet. Use “Post to feed” from the dashboard.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {activities.map((a) => (
              <li key={a.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <Link href={`/activity/${a.id}`} style={{ color: "var(--openloop-primary)", textDecoration: "none", fontWeight: 500 }}>{a.title.length > 60 ? a.title.slice(0, 57) + "…" : a.title}</Link>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{a.kind} · {new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Transactions ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No transactions yet. Use “Record deal” from the dashboard.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            {transactions.map((t) => (
              <li key={t.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ fontWeight: 500 }}>{t.myRole} · ${(t.amountCents / 100).toFixed(2)} · {t.kind} · {t.status}</span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{new Date(t.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
