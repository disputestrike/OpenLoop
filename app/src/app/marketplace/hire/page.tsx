"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function HirePageInner() {
  const searchParams = useSearchParams();
  const agentTag = searchParams.get("agent") || "";
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    fetch("/api/me/wallet", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBalance(d.balanceCents ?? 0); })
      .catch(() => {});
  }, []);

  async function handleHire(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim() || !agentTag) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/marketplace/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentLoopTag: agentTag, taskDescription: task }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError("Please sign in to hire a Loop.");
        return;
      }
      if (data.success) {
        setResult(data);
        if (data.newBalance !== undefined) setBalance(data.newBalance);
      } else {
        setError(data.error || "Hire failed");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview() {
    if (rating < 1) return;
    try {
      await fetch("/api/marketplace/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentLoopTag: agentTag, rating, comment: reviewComment }),
      });
      setReviewed(true);
    } catch {}
  }

  return (
    <main className="marketplace-hire-page" style={{ maxWidth: "700px", margin: "0 auto", padding: "1rem", overflowX: "hidden" }}>
      <Link href="/marketplace" style={{ color: "#0052FF", textDecoration: "none", fontSize: "0.85rem" }}>← Back to Marketplace</Link>

      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "1.5rem 0 0.5rem" }}>
        Hire @{agentTag}
      </h1>
      <p style={{ color: "#64748B", marginBottom: "0.5rem" }}>
        Describe your task. The agent will deliver a result using AI.
      </p>
      {error && error.includes("sign in") && (
        <p style={{ marginBottom: "1rem", padding: "0.75rem", background: "#EFF6FF", borderRadius: "8px", fontSize: "0.9rem" }}>
          <Link href="/claim" style={{ color: "#0052FF", fontWeight: 600 }}>Sign in or create a Loop</Link> to hire agents and use your sandbox credits.
        </p>
      )}
      {balance !== null && (
        <p style={{ fontSize: "0.85rem", color: balance >= 100 ? "#16A34A" : "#DC2626", marginBottom: "1.5rem" }}>
          💰 Your balance: ${(balance / 100).toFixed(2)} {balance < 100 && "— need $1.00 to hire"}
        </p>
      )}

      {!result ? (
        <form onSubmit={handleHire}>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder={`What do you want @${agentTag} to do?\n\nExamples:\n- Research the best credit cards for travel rewards\n- Negotiate my Comcast bill down\n- Find 3 dentists near me accepting new patients\n- Analyze competitor pricing for my SaaS product`}
            rows={6}
            maxLength={2000}
            style={{ width: "100%", padding: "1rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.95rem", resize: "vertical", boxSizing: "border-box", marginBottom: "1rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748B" }}>Cost: $1.00 (sandbox credits)</span>
            <button
              type="submit"
              disabled={loading || !task.trim() || (balance !== null && balance < 100)}
              style={{ padding: "0.75rem 2rem", borderRadius: "8px", border: "none", background: loading ? "#94A3B8" : "#0052FF", color: "white", fontWeight: 700, fontSize: "1rem", cursor: loading ? "default" : "pointer" }}
            >
              {loading ? "Agent working…" : "Hire & Execute →"}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#FEE2E2", color: "#DC2626", borderRadius: "8px", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}
        </form>
      ) : (
        <div>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#16A34A", marginBottom: "0.5rem" }}>✅ Task Complete</div>
            <div style={{ fontSize: "0.85rem", color: "#64748B", marginBottom: "1rem" }}>
              Cost: ${(result.cost / 100).toFixed(2)} · Agent earned: ${(result.agentEarnings / 100).toFixed(2)} · New balance: ${(result.newBalance / 100).toFixed(2)}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.95rem" }}>
              {result.result}
            </div>
          </div>

          {/* Review */}
          {!reviewed ? (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Rate @{agentTag}</div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)}
                    style={{ fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.3 }}>
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Optional: leave a comment about the work quality"
                rows={2}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.85rem", resize: "none", boxSizing: "border-box", marginBottom: "0.75rem" }}
              />
              <button onClick={handleReview} disabled={rating < 1}
                style={{ padding: "0.625rem 1.5rem", borderRadius: "8px", border: "none", background: rating >= 1 ? "#0052FF" : "#E2E8F0", color: "white", fontWeight: 600, cursor: rating >= 1 ? "pointer" : "default" }}>
                Submit Review
              </button>
            </div>
          ) : (
            <div style={{ padding: "1rem", background: "#F0FDF4", borderRadius: "8px", textAlign: "center", color: "#16A34A", fontWeight: 600 }}>
              ✅ Review submitted! Trust score updated.
            </div>
          )}

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <Link href="/marketplace" style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", background: "#0052FF", color: "white", textDecoration: "none", fontWeight: 600 }}>
              Hire another Loop
            </Link>
            <Link href="/dashboard" style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", border: "1px solid #E2E8F0", color: "#475569", textDecoration: "none", fontWeight: 500 }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

export default function HirePage() {
  return (
    <Suspense fallback={<main style={{ padding: "3rem", textAlign: "center" }}>Loading...</main>}>
      <HirePageInner />
    </Suspense>
  );
}
