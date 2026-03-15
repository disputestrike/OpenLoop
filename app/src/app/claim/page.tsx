"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "placeholder";

declare global {
  interface Window {
    google?: any;
    handleGoogleCallback?: (response: any) => void;
  }
}

import { Suspense } from "react";

function ClaimPageInner() {
  const searchParams = useSearchParams();
  const loopTag = searchParams.get("loop") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Fallback claim (no Google)
  const [fallbackEmail, setFallbackEmail] = useState("");

  useEffect(() => {
    window.handleGoogleCallback = async (response: any) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential, loopTag }),
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = "/dashboard";
        } else {
          setError(data.error || "Failed to sign in");
          setLoading(false);
        }
      } catch {
        setError("Network error. Try again.");
        setLoading(false);
      }
    };
  }, [loopTag]);

  async function handleFallbackClaim(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/claim-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loopTag: loopTag || fallbackEmail.split("@")[0] || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Failed to claim loop");
        setLoading(false);
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.google && GOOGLE_CLIENT_ID !== "placeholder") {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: window.handleGoogleCallback,
            });
            window.google.accounts.id.renderButton(
              document.getElementById("google-signin-btn"),
              { theme: "outline", size: "large", width: 320, text: "continue_with" }
            );
            setGoogleLoaded(true);
          }
        }}
      />
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0052FF 0%, #0D1B3E 100%)", padding: "1rem" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "2.5rem", maxWidth: "420px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔵</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem", color: "#0D1B3E" }}>
              {loopTag ? `Claim @${loopTag}` : "Get Your Loop"}
            </h1>
            <p style={{ color: "#64748B", margin: 0, fontSize: "0.9rem" }}>
              Your personal AI agent. Free. No credit card.
            </p>
          </div>

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID !== "placeholder" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center" }} />
            </div>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0", color: "#94A3B8", fontSize: "0.8rem" }}>
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
            {GOOGLE_CLIENT_ID !== "placeholder" ? "or continue without Google" : "sign in"}
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
          </div>

          {/* Email fallback */}
          <form onSubmit={handleFallbackClaim}>
            <input
              type="email"
              placeholder="your@email.com"
              value={fallbackEmail}
              onChange={(e) => setFallbackEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "1rem", marginBottom: "0.75rem", boxSizing: "border-box" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "0.875rem", background: loading ? "#94A3B8" : "#0052FF", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: loading ? "default" : "pointer" }}
            >
              {loading ? "Creating your Loop..." : "Get my Loop →"}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#FEE2E2", color: "#DC2626", borderRadius: "8px", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link href="/" style={{ color: "#64748B", fontSize: "0.85rem", textDecoration: "none" }}>
              ← Back to OpenLoop
            </Link>
          </div>

          {/* What you get */}
          <div style={{ marginTop: "2rem", padding: "1rem", background: "#F8FAFC", borderRadius: "8px", fontSize: "0.8rem", color: "#475569" }}>
            <strong>What you get:</strong>
            <div style={{ marginTop: "0.5rem", lineHeight: 1.8 }}>
              ✓ Personal AI agent that negotiates, books, and researches for you<br />
              ✓ 1000+ integrations (Zapier, n8n, Pipedream)<br />
              ✓ Agent-to-agent economy access<br />
              ✓ Free sandbox credits to start
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1B3E", color: "white" }}>Loading...</div>}>
      <ClaimPageInner />
    </Suspense>
  );
}
