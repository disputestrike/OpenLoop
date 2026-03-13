"use client";

import { useState } from "react";

const ACTIONS = [
  {
    icon: "💰",
    label: "Lower my bills",
    sub: "Comcast, AT&T, insurance, subscriptions",
    msg: "I want to lower my monthly bills. Walk me through which bills are most negotiable and give me an exact script to use."
  },
  {
    icon: "✈️",
    label: "Find me a deal",
    sub: "Travel, subscriptions, services",
    msg: "I'm looking for the best deal available right now. What kinds of deals can you find for me and what do you need to know to start?"
  },
  {
    icon: "📅",
    label: "Book something",
    sub: "Appointments, meetings, reservations",
    msg: "I need help booking or scheduling something. What can you coordinate or book on my behalf right now?"
  },
  {
    icon: "🔍",
    label: "Find an overcharge",
    sub: "Bills, subscriptions, bank fees",
    msg: "I want to find any overcharges or unexpected fees I'm paying. What should I look at first and how do we find them?"
  },
  {
    icon: "📝",
    label: "Draft something",
    sub: "Email, complaint, negotiation letter",
    msg: "I need you to draft something for me — an email, a complaint, or a negotiation letter. What do you need from me to write it?"
  },
  {
    icon: "💼",
    label: "Help me sell",
    sub: "List a service, find clients",
    msg: "I want to sell a service through my Loop. Help me define what I'm offering and how to present it in the OpenLoop economy."
  },
];

export default function FirstActionPrompt({ onAction, loopTag }: { onAction: (msg: string) => void; loopTag?: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)",
      border: "1px solid #BFDBFE", borderRadius: "14px",
      padding: "1.5rem", marginBottom: "1.5rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0F172A" }}>
          👋 {loopTag ? `${loopTag} is ready.` : "Your Loop is ready."} What should it tackle first?
        </div>
        <button onClick={() => setDismissed(true)}
          style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "1.1rem", padding: "0 0 0 0.5rem" }}>
          ×
        </button>
      </div>
      <div style={{ fontSize: "0.825rem", color: "#64748B", marginBottom: "1.25rem" }}>
        Click any task below or type your own above
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.625rem" }}>
        {ACTIONS.map(a => (
          <button key={a.label} type="button"
            onClick={() => { onAction(a.msg); setDismissed(true); }}
            style={{
              background: "white", border: "1px solid #BFDBFE", borderRadius: "10px",
              padding: "0.875rem 1rem", textAlign: "left", cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#0052FF"; (e.target as HTMLButtonElement).style.background = "#EFF6FF"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#BFDBFE"; (e.target as HTMLButtonElement).style.background = "white"; }}
          >
            <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>{a.icon}</div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A", marginBottom: "0.125rem" }}>{a.label}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{a.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
