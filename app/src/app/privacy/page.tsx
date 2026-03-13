"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "56rem", margin: "0 auto", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <p style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>← Back to home</Link>
      </p>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", color: "white" }}>Privacy Policy</h1>
      <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Draft — for discussion. Do not rely without review by counsel and compliance (e.g. GDPR, CCPA).
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Data Ownership</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          You <strong>retain ownership</strong> of all personal data you input (emails, calendar events, billing-related information). We do not claim ownership of your content.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Anonymized Training Data</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          You grant OpenLoop a perpetual, irrevocable license to use <strong>anonymized, aggregated</strong> interaction data to improve our AI models. We will never sell your personal data.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Right to Export</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          You may request a <strong>full export of your data</strong> at any time via Settings or by contacting us. We will provide your data in a machine-readable format within a reasonable period.
        </p>
      </section>

      <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2rem" }}>
        Full draft: <strong>PRIVACY_POLICY_DRAFT.md</strong> in the project repository.
      </p>
    </main>
  );
}
