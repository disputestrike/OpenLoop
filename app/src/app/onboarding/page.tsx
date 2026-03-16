"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PERSONAS = [
  { id: "personal", icon: "🧑", label: "Personal Assistant", desc: "Lower bills, book appointments, find deals — your AI working for you 24/7" },
  { id: "buyer",    icon: "🛒", label: "Buyer Agent",        desc: "Let your Loop purchase, book, and contract on your behalf within limits you set" },
  { id: "seller",   icon: "💼", label: "Seller Agent",       desc: "Sell your services through your Loop — it handles inquiries, quotes, and contracts" },
  { id: "business", icon: "🏢", label: "Business Loop",      desc: "Customer service, sales, and support at scale — one identity, unlimited conversations" },
  { id: "general",  icon: "🤖", label: "General AI",         desc: "Chat and advice only — no actions, no transactions, just intelligence" },
];

const SKILLS = [
  { tier: 0, id: "chat",      label: "Chat & Advice",         desc: "Your Loop can talk, research, and advise. Always on by default.", defaultOn: true,  required: true },
  { tier: 0, id: "pr",        label: "PR & Communication",    desc: "Draft emails, messages, and public responses on your behalf.", defaultOn: true,  required: true },
  { tier: 1, id: "negotiate", label: "Negotiate & Draft",     desc: "Loop drafts negotiation strategies and emails. You approve before anything is sent.", defaultOn: false, required: false },
  { tier: 1, id: "research",  label: "Deep Research",         desc: "Loop searches the web, compares prices, finds deals and alternatives.", defaultOn: false, required: false },
  { tier: 2, id: "buy",       label: "Buy Within Limits",     desc: "Loop can make purchases and bookings up to a spending limit you set.", defaultOn: false, required: false },
  { tier: 2, id: "dispute",   label: "File Disputes",         desc: "Loop can file refund requests and disputes on your behalf.", defaultOn: false, required: false },
  { tier: 3, id: "accounts",  label: "Access My Accounts",    desc: "Loop can connect to your accounts to verify savings and execute tasks. Requires identity verification.", defaultOn: false, required: false },
  { tier: 3, id: "sell",      label: "Sell My Services",      desc: "Loop can list your services, accept contracts, and invoice clients.", defaultOn: false, required: false },
];

const KB_PROMPTS = [
  { id: "bills",    label: "What bills do you pay monthly?",          placeholder: "e.g. Comcast $120, AT&T $85, Netflix $18, gym $45..." },
  { id: "goals",    label: "What would you most like your Loop to help you with?", placeholder: "e.g. Lower my bills, find flight deals, book appointments..." },
  { id: "limits",   label: "Anything your Loop should never do?",     placeholder: "e.g. Never share my address, never contact my employer..." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [loopTag, setLoopTag] = useState("");
  // Step 2
  const [persona, setPersona] = useState("personal");
  // Step 3
  const [skills, setSkills] = useState<Record<string, boolean>>(
    Object.fromEntries(SKILLS.map(s => [s.id, s.defaultOn]))
  );
  // Step 4
  const [kb, setKb] = useState<Record<string, string>>({});
  const [kbFile, setKbFile] = useState<File | null>(null);
  // Step 5
  const [spendLimit, setSpendLimit] = useState("50");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);

  const totalSteps = 5;
  const progress = Math.round((step / totalSteps) * 100);

  async function saveStep(stepNum: number, data: object) {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ step: stepNum, data }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to save");
    }
    return res.json();
  }

  async function next(data: object) {
    setSaving(true);
    setError("");
    try {
      await saveStep(step, data);
      if (step < totalSteps) {
        setStep(step + 1);
      } else {
        router.push("/dashboard?onboarded=1");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem",
    fontFamily: "system-ui, sans-serif", overflowX: "hidden",
  };
  const progressBarStyle: React.CSSProperties = {
    height: "4px", background: "#E2E8F0", borderRadius: "2px",
    marginBottom: "2rem", overflow: "hidden",
  };
  const progressFillStyle: React.CSSProperties = {
    height: "100%", width: `${progress}%`,
    background: "var(--openloop-primary, #0052FF)",
    transition: "width 0.3s ease",
  };
  const titleStyle: React.CSSProperties = {
    fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.5rem",
  };
  const subtitleStyle: React.CSSProperties = {
    fontSize: "1rem", color: "#64748B", marginBottom: "2rem",
  };
  const btnStyle = (primary = true): React.CSSProperties => ({
    padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600,
    fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer",
    background: primary ? "var(--openloop-primary, #0052FF)" : "#F1F5F9",
    color: primary ? "white" : "#0F172A",
    border: "none", opacity: saving ? 0.7 : 1,
  });

  return (
    <div style={containerStyle}>
      {/* Progress bar */}
      <div style={progressBarStyle}>
        <div style={progressFillStyle} />
      </div>
      <p style={{ fontSize: "0.8rem", color: "#94A3B8", marginBottom: "1.5rem" }}>
        Step {step} of {totalSteps} — Your Loop is taking shape
      </p>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "0.75rem 1rem", color: "#DC2626", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* ─── STEP 1: NAME ─── */}
      {step === 1 && (
        <div>
          <div style={titleStyle}>Name your Loop</div>
          <div style={subtitleStyle}>This becomes your Loop tag — your permanent identity in the OpenLoop economy. Choose wisely.</div>
          <input
            value={loopTag}
            onChange={e => setLoopTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32))}
            placeholder="e.g. Marcus, Quinn, Riley..."
            style={{ width: "100%", padding: "0.875rem 1rem", borderRadius: "8px", border: "1.5px solid #CBD5E1", fontSize: "1.1rem", fontWeight: 600, boxSizing: "border-box", marginBottom: "0.5rem" }}
          />
          <p style={{ fontSize: "0.8rem", color: "#94A3B8", marginBottom: "1.5rem" }}>
            Your Loop will be known as @{loopTag || "yourname"} — visible in the directory and on your shareable card
          </p>
          <button style={btnStyle()} disabled={!loopTag.trim() || saving} onClick={() => next({ loopTag: loopTag.trim() })}>
            {saving ? "Saving…" : "Next →"}
          </button>
        </div>
      )}

      {/* ─── STEP 2: PERSONA ─── */}
      {step === 2 && (
        <div>
          <div style={titleStyle}>Choose your Loop&apos;s persona</div>
          <div style={subtitleStyle}>What is your Loop&apos;s primary job? This sets its default skills and how it presents itself to others.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {PERSONAS.map(p => (
              <div key={p.id} onClick={() => setPersona(p.id)}
                style={{ padding: "1rem 1.25rem", borderRadius: "10px", cursor: "pointer",
                  border: persona === p.id ? "2px solid var(--openloop-primary, #0052FF)" : "1.5px solid #CBD5E1",
                  background: persona === p.id ? "#EFF6FF" : "white",
                  transition: "all 0.15s" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
                  {p.icon} {p.label}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#64748B" }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(1)}>← Back</button>
            <button style={btnStyle()} disabled={saving} onClick={() => next({ persona })}>
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: SKILLS ─── */}
      {step === 3 && (
        <div>
          <div style={titleStyle}>Enable your Loop&apos;s skills</div>
          <div style={subtitleStyle}>Chat and advice are always on. Every additional skill requires your explicit permission. You can change these anytime.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {SKILLS.map(s => (
              <div key={s.id} style={{ padding: "1rem 1.25rem", borderRadius: "10px",
                border: "1.5px solid #CBD5E1",
                background: s.required ? "#F8FAFC" : "white",
                opacity: s.required ? 0.8 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                      {s.label}
                      {s.tier >= 2 && <span style={{ marginLeft: "8px", fontSize: "0.7rem", background: s.tier === 3 ? "#FEF2F2" : "#FFFBEB", color: s.tier === 3 ? "#DC2626" : "#D97706", border: `1px solid ${s.tier === 3 ? "#FECACA" : "#FDE68A"}`, borderRadius: "4px", padding: "1px 6px" }}>Tier {s.tier}</span>}
                    </div>
                    <div style={{ fontSize: "0.825rem", color: "#64748B" }}>{s.desc}</div>
                  </div>
                  <input type="checkbox"
                    checked={s.required || skills[s.id]}
                    disabled={s.required}
                    onChange={e => setSkills({ ...skills, [s.id]: e.target.checked })}
                    style={{ width: "18px", height: "18px", marginLeft: "12px", marginTop: "2px", cursor: s.required ? "default" : "pointer" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(2)}>← Back</button>
            <button style={btnStyle()} disabled={saving} onClick={() => next({ skills })}>
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: KNOWLEDGE BASE ─── */}
      {step === 4 && (
        <div>
          <div style={titleStyle}>Build your Loop&apos;s knowledge base</div>
          <div style={subtitleStyle}>This is what makes your Loop yours. The more context you give it, the more useful it becomes immediately.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            {KB_PROMPTS.map(prompt => (
              <div key={prompt.id}>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.4rem", color: "#0F172A" }}>
                  {prompt.label}
                </label>
                <textarea
                  value={kb[prompt.id] || ""}
                  onChange={e => setKb({ ...kb, [prompt.id]: e.target.value })}
                  placeholder={prompt.placeholder}
                  rows={3}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid #CBD5E1", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.4rem", color: "#0F172A" }}>
                Upload a document (optional)
              </label>
              <input type="file" accept=".pdf,.txt,.csv,.docx"
                onChange={e => setKbFile(e.target.files?.[0] || null)}
                style={{ fontSize: "0.875rem", color: "#64748B" }}
              />
              <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                PDF, TXT, CSV, or DOCX. Your Loop will extract and learn from it.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(3)}>← Back</button>
            <button style={btnStyle()} disabled={saving} onClick={() => next({ kb, hasFile: !!kbFile })}>
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: LIMITS ─── */}
      {step === 5 && (
        <div>
          <div style={titleStyle}>Set your limits</div>
          <div style={subtitleStyle}>You are always in control. Tell your Loop exactly how far it can go without asking you first.</div>

          {skills.buy && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
                Maximum spend without asking me: ${spendLimit}
              </label>
              <input type="range" min="0" max="500" step="5"
                value={spendLimit}
                onChange={e => setSpendLimit(e.target.value)}
                style={{ width: "100%", marginBottom: "0.25rem" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94A3B8" }}>
                <span>$0 (always ask)</span><span>$500</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>How should your Loop notify you?</div>
            {[
              { id: "email", label: "Email notifications", sub: "Get a daily digest of what your Loop did", state: notifyEmail, set: setNotifyEmail },
              { id: "sms",   label: "SMS alerts",           sub: "Instant text for any action involving money", state: notifySms,  set: setNotifySms },
            ].map(n => (
              <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", border: "1.5px solid #CBD5E1", borderRadius: "8px", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{n.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748B" }}>{n.sub}</div>
                </div>
                <input type="checkbox" checked={n.state} onChange={e => n.set(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }} />
              </div>
            ))}
          </div>

          {/* Trust bonus preview */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#16A34A", marginBottom: "0.25rem" }}>🎉 Your Loop starts at 50% trust</div>
            <div style={{ fontSize: "0.875rem", color: "#15803D" }}>
              You completed onboarding — your Loop earns 50 trust points before its first task.
              That is halfway to Quinn&apos;s 96%. Every verified win builds from here.
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button style={btnStyle(false)} onClick={() => setStep(4)}>← Back</button>
            <button style={btnStyle()} disabled={saving}
              onClick={() => next({ spendLimitCents: parseInt(spendLimit) * 100, notifyEmail, notifySms })}>
              {saving ? "Activating your Loop…" : "🚀 Activate my Loop →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
