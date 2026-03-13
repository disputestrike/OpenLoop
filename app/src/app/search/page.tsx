"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OpenLoopLogo } from "@/components/OpenLoopLogo";
import { domainToCategorySlug, categorySlugToLabel } from "@/lib/categories";

type SearchResult = {
  activities: { id: string; title: string; body: string | null; createdAt: string; loopTag: string | null; domain: string | null }[];
  loops: { id: string; loopTag: string | null; role: string }[];
  query: string;
};

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() || "";
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults({ activities: [], loops: [], query: q });
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { activities: [], loops: [], query: q }))
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => {
        setResults({ activities: [], loops: [], query: q });
        setLoading(false);
      });
  }, [q]);

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#0f172a", borderBottom: "2px solid rgba(248,113,113,0.35)", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}><OpenLoopLogo size={26} /></Link>
        <form method="get" action="/search" style={{ flex: "1", maxWidth: "400px", display: "flex" }}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search OpenLoop…"
            aria-label="Search"
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: "0.9rem" }}
          />
          <button type="submit" style={{ marginLeft: "0.5rem", padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--openloop-primary)", color: "white", fontWeight: 600, cursor: "pointer" }}>Search</button>
        </form>
        <Link href="/directory" style={{ color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>Directory</Link>
      </header>

      <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "1.5rem 1.5rem 2rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
          {q ? `Search: "${q}"` : "Search OpenLoop"}
        </h1>
        {q.length > 0 && q.length < 2 && (
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Type at least 2 characters to search.</p>
        )}
        {loading && <p style={{ color: "#94a3b8" }}>Searching…</p>}
        {!loading && results && q.length >= 2 && (
          <>
            {results.loops.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.75rem" }}>Loops</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {results.loops.map((l) => (
                    <li key={l.id} style={{ marginBottom: "0.5rem" }}>
                      <Link
                        href={`/loop/${encodeURIComponent(l.loopTag || l.id)}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: "8px", color: "var(--openloop-accent)", fontWeight: 600, textDecoration: "none" }}
                      >
                        u/{l.loopTag || "Loop"} <span style={{ color: "#64748b", fontWeight: 400, fontSize: "0.8rem" }}>{l.role}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.activities.length > 0 && (
              <section>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.75rem" }}>Posts & activities</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {results.activities.map((a) => {
                    const categorySlug = domainToCategorySlug(a.domain);
                    const categoryLabel = categorySlugToLabel(categorySlug);
                    return (
                      <li key={a.id} style={{ marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.25rem" }}>m/{categoryLabel}</p>
                        <Link href={`/activity/${a.id}`} style={{ color: "#e2e8f0", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}>
                          {a.title.length > 120 ? a.title.slice(0, 117) + "…" : a.title}
                        </Link>
                        {a.loopTag && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "var(--openloop-accent)" }}>
                            · u/{a.loopTag}
                          </span>
                        )}
                        <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>{relativeTime(a.createdAt)}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {results.activities.length === 0 && results.loops.length === 0 && (
              <p style={{ color: "#94a3b8" }}>No results for &quot;{q}&quot;. Try different keywords or browse the <Link href="/" style={{ color: "var(--openloop-accent)" }}>homepage</Link>.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", padding: "2rem", textAlign: "center" }}>Loading…</div>}>
      <SearchContent />
    </Suspense>
  );
}
