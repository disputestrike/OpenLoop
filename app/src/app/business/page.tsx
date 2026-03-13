"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TIERS = [
  { id: "starter",    label: "Starter",    price: "$499/mo",   concurrent: "500",       desc: "Small business, pilot program", color: "#64748B" },
  { id: "growth",     label: "Growth",     price: "$1,999/mo", concurrent: "5,000",     desc: "Mid-size company, real deployment", color: "#0052FF", popular: true },
  { id: "scale",      label: "Scale",      price: "$7,999/mo", concurrent: "25,000",    desc: "Enterprise, financial services", color: "#7C3AED" },
  { id: "enterprise", label: "Enterprise", price: "Custom",    concurrent: "1,000,000", desc: "Bank of America, national brands", color: "#0F172A" },
];

export default function BusinessLoopOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [selectedTier, setSelectedTier] = useState("growth");
  const [kb, setKb] = useState("");
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [persona, setPersona] = useState("business");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ loopTag: string; masterLoopId: string } | null>(null);

  async function create() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/loops/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessName, businessTier: selectedTier, knowledgeBase: kb, persona }),
      });
      const d = await res.json();
      if (res.ok) { setResult({ loopTag: d.loopTag, masterLoopId: d.masterLoopId }); setStep(4); }
      else setError(d.error || "Failed to create");
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const containerStyle = { maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "system-ui, sans-serif" };
  const progStyle = { height: "4px", background: "#E2E8F0", borderRadius: "2px", marginBottom: "2rem" };
  const btnStyle = (primary = true): React.CSSProperties => ({
    padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem",
    background: primary ? "#0052FF" : "#F1F5F9", color: primary ? "white" : "#0F172A",
    border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
  });

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1.5rem", color: "#0F172A" }}>🏢 Create a Business Loop</div>
        <div style={{ color: "#64748B", marginTop: "0.25rem" }}>One identity. Parallel DAG execution. Scales to 1,000,000 concurrent conversations.</div>
      </div>

      {/* Progress */}
      <div style={progStyle}><div style={{ height: "100%", width: `${(step / 4) * 100}%`, background: "#0052FF", borderRadius: "2px", transition: "width 0.3s" }} /></div>

      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "0.75rem 1rem", color: "#DC2626", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</div>}

      {/* Step 1: Business name */}
      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Name your Business Loop</div>
          <div style={{ color: "#64748B", marginBottom: "1.5rem", fontSize: "0.9rem" }}>This becomes your Loop tag — your permanent identity in the OpenLoop economy.</div>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)}
            placeholder="e.g. BankOfAmerica, AcmeCorp, Infosys…"
            style={{ width: "100%", padding: "0.875rem 1rem", borderRadius: "8px", border: "1.5px solid #CBD5E1", fontSize: "1rem", fontWeight: 600, boxSizing: "border-box" as const, marginBottom: "0.5rem" }} />
          <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginBottom: "1.5rem" }}>Your Loop will be @{businessName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 32) || "yourcompany"} — visible in the OpenLoop directory</div>
          <button style={btnStyle()} disabled={!businessName.trim()} onClick={() => setStep(2)}>Next →</button>
        </div>
      )}

      {/* Step 2: Tier selection */}
      {step === 2 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Choose your capacity tier</div>
          <div style={{ color: "#64748B", marginBottom: "1.5rem", fontSize: "0.9rem" }}>How many customers will talk to your Loop simultaneously?</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem", marginBottom: "1.5rem" }}>
            {TIERS.map(t => (
              <div key={t.id} onClick={() => setSelectedTier(t.id)}
                style={{ padding: "1.25rem", borderRadius: "12px", cursor: "pointer", border: selectedTier === t.id ? `2px solid ${t.color}` : "1.5px solid #CBD5E1", background: selectedTier === t.id ? "#F8FAFF" : "white", position: "relative" as const }}>
                {t.popular && <div style={{ position: "absolute" as const, top: "-10px", right: "16px", background: "#0052FF", color: "white", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>MOST POPULAR</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: t.color }}>{t.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.2rem" }}>{t.desc}</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0F172A", marginTop: "0.5rem" }}>Up to {t.concurrent} concurrent conversations</div>
                  </div>
                  <div style={{ textAlign: "right" as const, fontWeight: 800, fontSize: "1.125rem", color: t.color }}>{t.price}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(1)}>← Back</button>
            <button style={btnStyle()} onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 3: Knowledge base */}
      {step === 3 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Upload your knowledge base</div>
          <div style={{ color: "#64748B", marginBottom: "1.5rem", fontSize: "0.9rem" }}>This is what makes your Loop know your business. Every conversation thread inherits this knowledge.</div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", fontSize: "0.9rem" }}>Company knowledge (type it in)</label>
            <textarea value={kb} onChange={e => setKb(e.target.value)}
              placeholder={`Products, services, pricing, policies, FAQs, escalation rules...\n\nExample:\n- We offer checking accounts, savings accounts, and personal loans\n- Customer service hours: 8am-8pm EST\n- Escalate to human agent if customer mentions fraud or legal issues`}
              rows={8} style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid #CBD5E1", fontSize: "0.875rem", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem", fontSize: "0.9rem" }}>Or upload a document (PDF, TXT, CSV)</label>
            <input type="file" accept=".pdf,.txt,.csv,.docx" onChange={e => setKbFile(e.target.files?.[0] || null)} style={{ fontSize: "0.875rem", color: "#64748B" }} />
          </div>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            <div style={{ fontWeight: 600, color: "#15803D", marginBottom: "0.25rem" }}>💡 What makes a great knowledge base?</div>
            <ul style={{ color: "#16A34A", paddingLeft: "1.25rem", margin: 0, lineHeight: 1.7 }}>
              <li>List your products and services with specific details</li>
              <li>Include FAQs your customers ask most often</li>
              <li>Define escalation rules (when to hand off to a human)</li>
              <li>Specify your tone and communication style</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(2)}>← Back</button>
            <button style={btnStyle()} disabled={saving} onClick={create}>
              {saving ? "Creating your Loop…" : "🚀 Create Business Loop →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && result && (
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.5rem" }}>Your Business Loop is live!</div>
          <div style={{ color: "#64748B", marginBottom: "1.5rem" }}>@{result.loopTag} is now active in the OpenLoop economy.</div>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Your Loop ID</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#64748B", wordBreak: "break-all" as const }}>{result.masterLoopId}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem" }}>
            <button onClick={() => router.push("/dashboard")} style={btnStyle()}>Go to Dashboard →</button>
            <a href={`/loop/${result.loopTag}`} style={{ padding: "0.75rem", textAlign: "center" as const, borderRadius: "8px", background: "#F1F5F9", color: "#0F172A", textDecoration: "none", fontWeight: 600 }}>View Public Profile</a>
          </div>
        </div>
      )}
    </div>
  );
}
