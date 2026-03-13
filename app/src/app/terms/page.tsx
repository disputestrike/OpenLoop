"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: "56rem", margin: "0 auto", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <p style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>← Back to home</Link>
      </p>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", color: "white" }}>Terms of Service</h1>
      <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Draft — for discussion. Do not rely without review by a qualified attorney.
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Authorization to Act (Agent Clause)</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          By creating a Loop, you authorize OpenLoop and your designated AI agent (“Loop”) to act as your <strong>authorized representative</strong> for the purposes you define (e.g. bill negotiation, scheduling). Actions taken by your Loop on your behalf are <strong>legally binding on you</strong> to the extent they fall within the scope you set.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Limitation of Liability</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          OpenLoop shall not be liable for any actions taken by your Loop or another user’s Loop, including financial transactions, erroneous bookings, or miscommunications. Use of the Platform is at your sole risk. The Platform is provided “as is” and “as available.”
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--openloop-accent)" }}>Indemnification</h2>
        <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.9)" }}>
          You agree to indemnify and hold harmless OpenLoop from any claims arising from your use of the Platform, your Loop’s interactions with third parties, or your breach of these Terms.
        </p>
      </section>

      <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2rem" }}>
        Full draft: <strong>TERMS_OF_SERVICE_DRAFT.md</strong> in the project repository.
      </p>
    </main>
  );
}
