"use client";

import { useState } from "react";
import Link from "next/link";

export default function ClaimFlowPage() {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"Bills" | "Scheduling" | "">("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [matchedLoop, setMatchedLoop] = useState<{ id: string; trustScore: number; message: string } | null>(null);

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMatchedLoop(null);
    try {
      const res = await fetch("/api/loops/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), intent: intent || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        setStatus("error");
        return;
      }
      if (!data.loop) {
        setMessage(data.error || "No matching Loop right now.");
        setStatus("error");
        return;
      }
      setMatchedLoop({
        id: data.loop.id,
        trustScore: data.loop.trustScore,
        message: data.loop.message,
      });
      setStatus("idle");
    } catch {
      setMessage("Network error");
      setStatus("error");
    }
  }

  async function handleClaim() {
    if (!matchedLoop || !email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/loops/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loopId: matchedLoop.id, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        setStatus("error");
        return;
      }
      setMessage("Check your email to claim your Loop.");
      setStatus("success");
    } catch {
      setMessage("Network error");
      setStatus("error");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Claim a Loop</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Get a battle-tested Loop matched to what you need.
      </p>

      {!matchedLoop ? (
        <form onSubmit={handleMatch}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#94a3b8" }}>What do you need?</label>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value as "Bills" | "Scheduling" | "")}
            style={{
              padding: "0.75rem",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
            }}
          >
            <option value="">Any</option>
            <option value="Bills">Bills</option>
            <option value="Scheduling">Scheduling</option>
          </select>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#94a3b8" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            style={{
              padding: "0.75rem 1rem",
              width: "100%",
              marginBottom: "1rem",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#e2e8f0",
            }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "#0ea5e9",
              color: "#fff",
              cursor: status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? "Finding…" : "Find a Loop"}
          </button>
        </form>
      ) : (
        <div>
          <p style={{ color: "#4ade80", marginBottom: "1rem" }}>{matchedLoop.message}</p>
          <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
            Trust Score: <strong>{matchedLoop.trustScore}</strong>/100
          </p>
          <button
            onClick={handleClaim}
            disabled={status === "loading"}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "#0ea5e9",
              color: "#fff",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              marginRight: "0.75rem",
            }}
          >
            {status === "loading" ? "Sending…" : "Claim this Loop"}
          </button>
          <button
            type="button"
            onClick={() => setMatchedLoop(null)}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "1px solid #475569",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            Choose another
          </button>
        </div>
      )}

      {status === "success" && <p style={{ color: "#4ade80", marginTop: "1rem" }}>{message}</p>}
      {status === "error" && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#f87171", marginBottom: "0.75rem" }}>{message}</p>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "0.5rem" }}>No Loops to claim yet? We’ll create one for you.</p>
          <Link href="/#get-your-loop" style={{ color: "#0ea5e9", fontWeight: 600 }}>Get your Loop on the homepage →</Link>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ color: "#64748b" }}>← Back to home</Link>
      </p>
    </main>
  );
}
