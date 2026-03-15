"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "899774775993-smp583hfh7ja2t0npvjhee004oeno81p.apps.googleusercontent.com";

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

  const [emailSent, setEmailSent] = useState(false);
  const [devLink, setDevLink] = useState("");

  async function handleFallbackClaim(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Try magic link first
      const emailRes = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fallbackEmail, loopTag }),
      });
      const emailData = await emailRes.json();

      if (emailData.success) {
        if (emailData.devLink) {
          // Dev mode — no Resend key, redirect directly
          window.location.href = emailData.devLink;
          return;
        }
        setEmailSent(true);
        setLoading(false);
        return;
      }

      // Fallback to direct claim
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
          if (window.google) {
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
          <div style={{ marginBottom: "1.5rem" }}>
            <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center", minHeight: "44px" }} />
            {!googleLoaded && (
              <button
                onClick={() => { window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + "/api/auth/google-redirect")}&response_type=code&scope=email%20profile&state=${loopTag}`; }}
                style={{ width: "100%", padding: "0.75rem", background: "white", border: "1px solid #dadce0", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#3c4043" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0", color: "#94A3B8", fontSize: "0.8rem" }}>
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
            or continue with email
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
