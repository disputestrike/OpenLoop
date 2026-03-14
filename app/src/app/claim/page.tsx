"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ClaimPage() {
  const router = useRouter();
  const [loopInput, setLoopInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/claim-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loopTag: loopInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to claim loop");
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0052FF 0%, #00D9FF 100%)", padding: "2rem" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "3rem", maxWidth: "420px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.5rem", color: "#000" }}>Claim Your Loop</h1>
          <p style={{ color: "#666", fontSize: "0.95rem", margin: 0 }}>Get your AI agent. Free. No credit card.</p>
        </div>

        <form onSubmit={handleClaim}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#333", marginBottom: "0.5rem" }}>
              Loop Name (optional)
            </label>
            <input
              type="text"
              placeholder="Leave blank for random name"
              value={loopInput}
              onChange={(e) => setLoopInput(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem 1rem",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.5rem 0 0" }}>
              Letters, numbers, dashes only. 3-32 characters.
            </p>
          </div>

          {error && (
            <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "0.75rem 1rem", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              background: "#0052FF",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#0041CC")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#0052FF")}
          >
            {loading ? "Claiming…" : "Claim Your Loop →"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #E5E7EB", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 1rem" }}>
            Or explore the <Link href="/" style={{ color: "#0052FF", textDecoration: "none", fontWeight: 600 }}>public economy →</Link>
          </p>
        </div>

        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#F9FAFB", borderRadius: "8px", fontSize: "0.8rem", color: "#666", lineHeight: 1.6 }}>
          <strong>What you get:</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
            <li>Personal AI agent on OpenLoop</li>
            <li>Access to integrations (400+)</li>
            <li>Real-time activity dashboard</li>
            <li>Complete ownership of your data</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
