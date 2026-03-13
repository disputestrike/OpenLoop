"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Source = { id: string; name: string; license: string | null; row_count: string; ingestion_started_at: string; ingestion_finished_at: string | null };
type Ingested = { id: string; source_type: string; language: string | null; domain: string | null; token_count_approx: number | null; created_at: string };

export default function AdminCorpusPage() {
  const [secret, setSecret] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [ingested, setIngested] = useState<Ingested[]>([]);
  const [totalIngested, setTotalIngested] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingestName, setIngestName] = useState("");
  const [ingestJson, setIngestJson] = useState("");
  const [ingesting, setIngesting] = useState(false);

  function load() {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    fetch(`/api/admin/corpus?admin_secret=${encodeURIComponent(secret)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Invalid secret" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        setSources(data.sources ?? []);
        setIngested(data.ingested ?? []);
        setTotalIngested(data.totalIngested ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function doIngest() {
    if (!secret.trim() || !ingestJson.trim()) return;
    let items: Array<{ content: string; source_type?: string; language?: string; domain?: string; token_count_approx?: number }>;
    try {
      const parsed = JSON.parse(ingestJson);
      items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
      if (!items.length) throw new Error("Need items[] or array of { content }");
    } catch (e) {
      setError("Invalid JSON. Use [ { \"content\": \"...\" }, ... ] or { \"items\": [ ... ] }");
      return;
    }
    setIngesting(true);
    setError("");
    fetch("/api/admin/corpus", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ name: ingestName || "manual_ingest", items }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIngestJson("");
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setIngesting(false));
  }

  useEffect(() => {
    if (secret && (sources.length > 0 || totalIngested > 0)) load();
  }, []);

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto", minHeight: "100vh", background: "var(--openloop-section-bg)", color: "var(--openloop-text)" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Corpus (ingested pre-training data)</h1>
        <Link href="/admin" style={{ color: "var(--openloop-primary)", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</Link>
      </div>
      <p style={{ color: "var(--openloop-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        Ingest external text for LLM data strategy. Use admin secret to list sources and ingest JSON.
      </p>
      <input
        type="password"
        placeholder="Admin secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--openloop-border)", marginRight: "0.5rem", marginBottom: "0.5rem" }}
      />
      <button type="button" onClick={load} disabled={loading} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--openloop-primary)", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
        Load
      </button>
      {error && <p style={{ color: "#dc3545", marginTop: "0.5rem" }}>{error}</p>}

      {totalIngested > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Total ingested rows: {totalIngested.toLocaleString()}</h2>
          <h3 style={{ fontSize: "1rem", marginTop: "1rem" }}>Sources</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {sources.map((s) => (
              <li key={s.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--openloop-border)" }}>
                {s.name} · {s.row_count} rows · {s.ingestion_finished_at ? "Done" : "Running"}
              </li>
            ))}
          </ul>
          <h3 style={{ fontSize: "1rem", marginTop: "1rem" }}>Recent ingested (sample)</h3>
          <ul style={{ listStyle: "none", padding: 0, fontSize: "0.875rem" }}>
            {ingested.slice(0, 20).map((r) => (
              <li key={r.id} style={{ padding: "0.35rem 0", borderBottom: "1px solid var(--openloop-border)" }}>
                {r.source_type} {r.language ? `· ${r.language}` : ""} {r.domain ? `· ${r.domain}` : ""} · {r.created_at}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: "2rem", padding: "1rem", border: "1px solid var(--openloop-border)", borderRadius: "12px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Ingest new corpus</h2>
        <input
          type="text"
          placeholder="Source name (optional)"
          value={ingestName}
          onChange={(e) => setIngestName(e.target.value)}
          style={{ width: "100%", maxWidth: "20rem", padding: "0.5rem", marginBottom: "0.5rem", borderRadius: "6px", border: "1px solid var(--openloop-border)", display: "block" }}
        />
        <textarea
          placeholder='[ { "content": "First paragraph..." }, { "content": "Second...", "source_type": "web", "language": "en" } ]'
          value={ingestJson}
          onChange={(e) => setIngestJson(e.target.value)}
          rows={8}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--openloop-border)", fontFamily: "monospace", fontSize: "0.8rem" }}
        />
        <button type="button" onClick={doIngest} disabled={ingesting || !secret.trim()} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--openloop-primary)", color: "#fff", cursor: ingesting ? "not-allowed" : "pointer" }}>
          {ingesting ? "Ingesting…" : "Ingest"}
        </button>
      </section>
    </main>
  );
}
