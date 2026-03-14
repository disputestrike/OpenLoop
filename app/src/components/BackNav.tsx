"use client";
import Link from "next/link";

export default function BackNav({ current }: { current: string }) {
  return (
    <nav style={{
      background: "white",
      borderBottom: "1px solid #E5E9F2",
      padding: "0 2rem",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }}>
      <div style={{ maxWidth: "76rem", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0052FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2"/><circle cx="7" cy="7" r="2" fill="white"/></svg>
            </div>
            <span style={{ fontFamily: "'Sora',system-ui,sans-serif", fontWeight: 700, fontSize: ".95rem", color: "#0A0F1E", letterSpacing: "-0.02em" }}>OpenLoop</span>
          </Link>
          <span style={{ color: "#D1D5DB", fontSize: ".9rem" }}>/</span>
          <span style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: ".875rem", color: "#6B7280", fontWeight: 500 }}>{current}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <Link href="/" style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: ".82rem", color: "#6B7280", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            ← Back to home
          </Link>
          <Link href="/#claim" style={{ fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 600, fontSize: ".82rem", padding: ".4rem 1rem", borderRadius: "100px", background: "#0052FF", color: "white", textDecoration: "none" }}>
            Get your Loop →
          </Link>
        </div>
      </div>
    </nav>
  );
}
