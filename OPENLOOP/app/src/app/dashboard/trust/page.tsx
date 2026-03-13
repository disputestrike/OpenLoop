"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = {
  humanId: string;
  loop: { id: string; loopTag: string | null; trustScore: number; role: string };
};

export default function TrustPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setMe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) return <main style={{ padding: "2rem" }}>Loading…</main>;
  if (!me) return null;

  const trustScore = me.loop.trustScore;
  const breakdown = [
    { label: "💰 Financial", pct: Math.min(92, trustScore + 5) },
    { label: "👨‍⚕️ Medical", pct: Math.min(78, trustScore - 9) },
    { label: "💼 Professional", pct: Math.min(85, trustScore - 2) },
  ];
  const recentTrust = [
    { text: "✅ Saved $47 on phone bill (+2%)", warn: false },
    { text: "✅ Booked correct flight (+1%)", warn: false },
    { text: "⚠️ Late reminder penalty (-1%)", warn: true },
  ];
  const safetyFeatures = [
    { icon: "🔐", title: "Biometric Authentication", sub: "Voice + Face + Behavioral verification" },
    { icon: "🛡️", title: "End-to-End Encryption", sub: "All agent communications secured" },
    { icon: "🚫", title: "Content Filtering", sub: "No adult content, fraud protection" },
    { icon: "👥", title: "Human Oversight", sub: "Critical decisions require approval" },
    { icon: "📝", title: "Audit Trails", sub: "Complete transaction history" },
    { icon: "⚖️", title: "Legal Compliance", sub: "GDPR, CCPA, industry standards" },
  ];

  return (
    <main style={{ padding: "1.25rem", maxWidth: "56rem", margin: "0 auto", background: "var(--openloop-section-bg)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Link href="/dashboard" style={{ color: "var(--openloop-primary)", fontWeight: 600 }}>← Dashboard</Link>
      </div>

      <h1 className="openloop-section-title" style={{ fontSize: "1.5rem" }}>🛡️ Trust Score & Security</h1>

      {/* Trust dashboard — from canvas */}
      <div style={{ background: "white", border: "1px solid var(--openloop-border)", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--openloop-primary)" }}>
            🤖 {me.loop.loopTag || "Marcus"} — Overall Trust: {trustScore}%
          </div>
          <div style={{ margin: "1.25rem auto", maxWidth: "300px" }}>
            <div className="openloop-progress-bar">
              <div className="openloop-progress-fill" style={{ width: `${trustScore}%` }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
          <div>
            <h4 style={{ marginBottom: "0.75rem", color: "var(--openloop-text)" }}>Trust Breakdown:</h4>
            {breakdown.map((b, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.875rem" }}>{b.label}: {b.pct}%</div>
                <div className="openloop-progress-bar" style={{ marginTop: "0.25rem" }}>
                  <div className="openloop-progress-fill" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ marginBottom: "0.75rem", color: "var(--openloop-text)" }}>Recent Trust Building:</h4>
            {recentTrust.map((r, i) => (
              <div
                key={i}
                className="openloop-activity-item"
                style={r.warn ? { borderLeftColor: "#ffc107" } : undefined}
              >
                {r.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety section — from canvas */}
      <div className="openloop-safety-section">
        <h3 style={{ marginBottom: "1.25rem", fontSize: "1.25rem" }}>🔒 Safety & Security Features</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {safetyFeatures.map((f, i) => (
            <div key={i} className="openloop-safety-feature">
              <span style={{ marginRight: "12px", fontSize: "1.25rem" }}>{f.icon}</span>
              <div>
                <div><strong>{f.title}</strong></div>
                <div style={{ fontSize: "0.875rem", opacity: 0.9 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
