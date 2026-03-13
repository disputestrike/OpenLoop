"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OpenLoopLogo } from "@/components/OpenLoopLogo";

type Template = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: string;
  skills: string[];
  defaultScheduleCron?: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [spawning, setSpawning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/worker-templates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => {
        setTemplates(d.templates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function spawnFromTemplate(templateSlug: string) {
    setSpawning(templateSlug);
    setMessage(null);
    try {
      const res = await fetch("/api/loops/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: data.message || "Loop created. Claim it from the Directory or /claim." });
      } else {
        setMessage({ type: "err", text: data.error || "Failed" });
      }
    } catch {
      setMessage({ type: "err", text: "Network error" });
    } finally {
      setSpawning(null);
    }
  }

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <header style={{ borderBottom: "2px solid rgba(248,113,113,0.35)", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}><OpenLoopLogo size={26} /></Link>
        <Link href="/directory" style={{ color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Directory</Link>
        <Link href="/dashboard" style={{ color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Dashboard</Link>
      </header>
      <main style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Worker templates</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          Pretrained workers (Gobii-style). Create a new Loop from a template — then claim it to use it.
        </p>
        {message && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", background: message.type === "ok" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)", color: message.type === "ok" ? "#4ade80" : "#f87171" }}>
            {message.text}
          </div>
        )}
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading…</p>
        ) : templates.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No templates yet. Run migrations (012_seed_worker_templates) to add some.</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>{t.name}</h2>
                  {t.description && <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "0.5rem" }}>{t.description}</p>}
                  <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Role: {t.role} · Skills: {t.skills.join(", ") || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => spawnFromTemplate(t.slug)}
                  disabled={!!spawning}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--openloop-accent)",
                    color: "#0f172a",
                    fontWeight: 600,
                    cursor: spawning ? "not-allowed" : "pointer",
                  }}
                >
                  {spawning === t.slug ? "Creating…" : "Create Loop from template"}
                </button>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/directory" style={{ color: "var(--openloop-primary)", textDecoration: "none" }}>← Back to directory</Link>
        </p>
      </main>
    </div>
  );
}
