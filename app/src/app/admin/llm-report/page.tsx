"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Report = {
  generatedAt: string;
  database: string;
  summary: { totalLlmCalls: number; totalActivities: number; totalComments: number; totalVotes: number; totalDeals: number; valueCents: number };
  llmByKind: { kind: string; count: number; lastAt: string | null }[];
  outcomePhrasing: { withDollar: number; withSaved: number; withTag: number; total: number; sampleTitles: string[] };
  domains: { domain: string; count: number }[];
  volumeLast24h: { llm: number; activities: number; comments: number };
  qualitySignals: { avgResponseLength: number; hasForbiddenPhrase: number; sampleResponses: string[] };
  recommendation: string;
};

export default function LLMReportPage() {
  const [secret, setSecret] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function loadReport() {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    fetch(`/api/analytics/llm-report?admin_secret=${encodeURIComponent(secret)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? "Invalid secret" : "Failed to load report");
        return res.json();
      })
      .then((data) => {
        if (data.report) setReport(data.report);
        else setError("No report in response");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto", minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>LLM &amp; Data Report</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            title={secret.trim() ? "Download anonymized training data (JSON)" : "Enter admin secret above first"}
            disabled={!secret.trim()}
            onClick={() => {
              if (!secret.trim()) return;
              window.open(`/api/analytics/training-export?admin_secret=${encodeURIComponent(secret)}&limit=10000`, "_blank");
            }}
            style={{
              background: "none",
              border: "none",
              color: secret.trim() ? "var(--openloop-accent)" : "#64748b",
              fontSize: "0.875rem",
              cursor: secret.trim() ? "pointer" : "not-allowed",
              textDecoration: "underline",
            }}
          >
            Training export (JSON)
          </button>
          <Link href="/admin" style={{ color: "var(--openloop-accent)", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</Link>
        </div>
      </div>
      <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem" }}>
        What we&apos;re learning from the data. Set <code>ADMIN_SECRET</code> in env, then enter it below.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadReport()}
          style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", minWidth: "12rem" }}
        />
        <button type="button" onClick={loadReport} disabled={loading} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--openloop-accent)", color: "#0f172a", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Loading…" : "Get report now"}
        </button>
      </div>
      {error && <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>}
      {report && (
        <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "1.5rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem" }}>Generated: {report.generatedAt} · DB: {report.database}</p>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>Summary</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>LLM calls</strong> {report.summary.totalLlmCalls.toLocaleString()}</li>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>Activities</strong> {report.summary.totalActivities.toLocaleString()}</li>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>Comments</strong> {report.summary.totalComments.toLocaleString()}</li>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>Votes</strong> {report.summary.totalVotes.toLocaleString()}</li>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>Deals</strong> {report.summary.totalDeals.toLocaleString()}</li>
            <li style={{ padding: "0.5rem", background: "#0f172a", borderRadius: "8px" }}><strong>Value</strong> ${(report.summary.valueCents / 100).toLocaleString()}</li>
          </ul>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>LLM by kind</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem" }}>
            {report.llmByKind.map((r) => (
              <li key={r.kind} style={{ padding: "0.35rem 0", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between" }}>
                <span>{r.kind}</span>
                <span>{r.count.toLocaleString()} · last {r.lastAt ? new Date(r.lastAt).toLocaleString() : "—"}</span>
              </li>
            ))}
          </ul>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>Outcome phrasing (posts)</h2>
          <p style={{ marginBottom: "0.5rem" }}>
            With $ or amount: <strong>{report.outcomePhrasing.withDollar}</strong> / {report.outcomePhrasing.total} ·
            With &quot;saved&quot;: <strong>{report.outcomePhrasing.withSaved}</strong> ·
            With #Tag: <strong>{report.outcomePhrasing.withTag}</strong>
          </p>
          {report.outcomePhrasing.sampleTitles.length > 0 && (
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1rem" }}>Sample titles: {report.outcomePhrasing.sampleTitles.slice(0, 3).join(" · ")}</p>
          )}
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>Domains</h2>
          <p style={{ marginBottom: "1rem" }}>{report.domains.map((d) => `${d.domain}: ${d.count}`).join(" · ") || "—"}</p>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>Volume (last 24h)</h2>
          <p style={{ marginBottom: "1rem" }}>LLM: {report.volumeLast24h.llm} · Activities: {report.volumeLast24h.activities} · Comments: {report.volumeLast24h.comments}</p>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--openloop-accent)" }}>Quality</h2>
          <p style={{ marginBottom: "0.5rem" }}>Avg response length: {report.qualitySignals.avgResponseLength} chars · Forbidden phrases: {report.qualitySignals.hasForbiddenPhrase}</p>
          {report.qualitySignals.sampleResponses.length > 0 && (
            <details style={{ marginBottom: "1rem" }}>
              <summary style={{ cursor: "pointer", color: "#94a3b8" }}>Sample responses</summary>
              <pre style={{ fontSize: "0.75rem", overflow: "auto", maxHeight: "200px", background: "#0f172a", padding: "0.75rem", borderRadius: "8px", marginTop: "0.5rem" }}>
                {report.qualitySignals.sampleResponses.map((r, i) => (`[${i + 1}] ${r}\n`)).join("")}
              </pre>
            </details>
          )}
          <div style={{ padding: "1rem", background: "rgba(0,255,136,0.1)", borderRadius: "8px", border: "1px solid var(--openloop-accent)" }}>
            <strong>Recommendation</strong><br />
            {report.recommendation}
          </div>
        </div>
      )}
    </main>
  );
}
