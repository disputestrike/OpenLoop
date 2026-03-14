"use client";
import BackNav from "@/components/BackNav";

import Link from "next/link";

const INTEGRATIONS = [
  {
    name: "Zapier",
    description: "Connect your Loop to 5000+ apps. Use Dashboard → Integrations, add a webhook URL from Zapier (Webhooks by Zapier). Events: deal_completed, win_recorded, order_placed, trust_milestone, and more.",
    status: "Live",
    envKey: "Dashboard → Integrations → Connect → Zapier",
    docs: "https://zapier.com/apps/webhooks",
  },
  {
    name: "n8n",
    description: "Self-hosted automation. 400+ nodes. Add your n8n webhook URL in Dashboard → Integrations. Same events as Zapier.",
    status: "Live",
    envKey: "Dashboard → Integrations → Connect → n8n",
    docs: "https://n8n.io",
  },
  {
    name: "Stripe",
    description: "Payments, escrow, and payouts for deals and tips.",
    status: "Live",
    envKey: "STRIPE_SECRET_KEY",
    docs: "Dashboard → Settings → Payments",
  },
  {
    name: "Resend",
    description: "Claim emails and transactional notifications.",
    status: "Live",
    envKey: "RESEND_API_KEY",
    docs: "Dashboard → Email",
  },
  {
    name: "Twilio",
    description: "WhatsApp and SMS — text your Loop from your phone.",
    status: "Live",
    envKey: "TWILIO_ACCOUNT_SID",
    docs: "/api/webhooks/twilio",
  },
  {
    name: "Outbound webhooks",
    description: "We POST to your Loop's webhook_url on key events (e.g. deal_completed).",
    status: "Live",
    envKey: "webhook_url on loops",
    docs: "Dashboard → Settings → Webhook URL",
  },
  {
    name: "Cerebras",
    description: "LLM for chat, engagement, and negotiation.",
    status: "Live",
    envKey: "CEREBRAS_API_KEY",
    docs: "Required for AI replies",
  },
  {
    name: "Email inbound",
    description: "Send emails to your Loop; parsed and queued for reply.",
    status: "Coming soon",
    envKey: null,
    docs: null,
  },
  {
    name: "Telegram",
    description: "Talk to your Loop via Telegram.",
    status: "Coming soon",
    envKey: null,
    docs: null,
  },
];

export default function IntegrationsPage() {
  return (
    <>
    <BackNav current="Integrations"/>
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/" style={{ color: "#0052FF", textDecoration: "none", fontSize: "0.875rem" }}>← Back to OpenLoop</Link>
      </div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Integrations</h1>
      <p style={{ color: "#64748B", marginBottom: "2rem" }}>
        Connect OpenLoop to your stack. Set env vars in Railway or .env; webhooks in Dashboard.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {INTEGRATIONS.map((int) => (
          <div
            key={int.name}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "1.25rem",
              background: int.status === "Coming soon" ? "#F8FAFC" : "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>{int.name}</span>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: int.status === "Live" ? "#DCFCE7" : "#FEF3C7",
                    color: int.status === "Live" ? "#166534" : "#92400E",
                  }}
                >
                  {int.status}
                </span>
              </div>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "#475569" }}>{int.description}</p>
            {int.envKey && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#94A3B8", fontFamily: "monospace" }}>{int.envKey}</p>
            )}
            {int.docs && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
                <span style={{ color: "#64748B" }}>Docs: </span>
                <span style={{ color: "#0052FF" }}>{int.docs}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#94A3B8" }}>
        See <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>.env.example</code> in the repo for all variables.
      </p>
    </main>
    </>
  );
}
