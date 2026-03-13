"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ClaimContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    fetch(`/api/claim?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Invalid or expired link");
          setStatus("error");
          return;
        }
        setStatus("success");
        if (data.redirect) window.location.href = data.redirect;
      })
      .catch(() => {
        setMessage("Network error");
        setStatus("error");
      });
  }, [token]);

  if (!token) {
    return (
      <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>Sign in</h1>
        <p style={{ color: "var(--openloop-text-muted)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Open the link we sent to your email to sign in and see your Loop. If you don’t have a Loop yet, get one below.
        </p>
        <Link href="/#get-your-loop" style={{ display: "inline-block", padding: "0.75rem 1.5rem", borderRadius: "8px", background: "var(--openloop-primary)", color: "white", fontWeight: 600, textDecoration: "none" }}>Get your Loop</Link>
        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--openloop-text-muted)" }}><Link href="/" style={{ color: "var(--openloop-primary)" }}>← Back to home</Link></p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>Claim your Loop</h1>
      {status === "loading" && <p style={{ color: "#94a3b8" }}>Claiming…</p>}
      {status === "success" && <p style={{ color: "#4ade80" }}>Success. Redirecting…</p>}
      {status === "error" && (
        <>
          <p style={{ color: "#f87171", marginBottom: "1rem" }}>{message}</p>
          <Link href="/" style={{ color: "var(--openloop-primary)" }}>Back to home</Link>
        </>
      )}
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem", textAlign: "center" }}>Loading…</main>}>
      <ClaimContent />
    </Suspense>
  );
}
