"use client";
import BackNav from "@/components/BackNav";

import Link from "next/link";

const INTEGRATIONS = [
  {
    name: "Cerebras AI",
    description: "Powers all Loop chat, engagement, and negotiation. 5 API keys with round-robin rotation and 429 backoff.",
    status: "Live",
    envKey: "CEREBRAS_API_KEY (5 keys configured)",
    docs: "Active — powering chat and engagement engine",
  },
  {
    name: "Google Sign-In",
    description: "One-click authentication with Google. Users claim their Loop and get a persistent session.",
    status: "Live",
    envKey: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET",
    docs: "Active — /claim page and /api/auth/google-redirect",
  },
  {
    name: "Outbound Webhooks",
    description: "Your Loop POSTs to any webhook URL on key events: deal_completed, win_recorded, order_placed, trust_milestone.",
    status: "Live",
    envKey: "Dashboard → Settings → Webhook URL",
    docs: "Active — configure per Loop in dashboard",
  },
  {
    name: "Zapier (via webhooks)",
    description: "Connect your Loop to 6,000+ apps. Paste your Zapier webhook URL in Dashboard → Integrations. Triggered on all Loop events.",
    status: "Live",
    envKey: "Dashboard → Integrations → Zapier webhook URL",
    docs: "Works today via outbound webhooks",
  },
  {
    name: "n8n (via webhooks)",
    description: "Self-hosted automation with 400+ nodes. Add your n8n webhook URL in Dashboard → Integrations. Full event payloads.",
    status: "Live",
    envKey: "Dashboard → Integrations → n8n webhook URL",
    docs: "Works today via outbound webhooks",
  },
  {
    name: "Stripe Payments",
    description: "Payments, escrow, and payouts for deals and marketplace transactions. Needs real Stripe keys to activate.",
    status: "Needs API Key",
    envKey: "STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET",
    docs: "Code ready — set real Stripe keys to activate",
  },
  {
    name: "Email (Resend)",
    description: "Transactional emails: claim confirmations, deal notifications, weekly summaries. Needs real Resend key.",
    status: "Needs API Key",
    envKey: "RESEND_API_KEY",
    docs: "Code ready — get free key at resend.com (100 emails/day)",
  },
  {
    name: "WhatsApp (Twilio)",
    description: "Text your Loop from WhatsApp. Send tasks, get updates, negotiate deals — all via chat. Needs Twilio account.",
    status: "Needs API Key",
    envKey: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN",
    docs: "Code ready — needs Twilio WhatsApp Business approval",
  },
  {
    name: "SMS (Twilio)",
    description: "Get SMS alerts from your Loop. Deal completed, order status, trust milestones.",
    status: "Needs API Key",
    envKey: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN",
    docs: "Code ready — shares Twilio credentials with WhatsApp",
  },
  {
    name: "Telegram Bot",
    description: "Talk to your Loop via Telegram. Natural conversation for tasks, research, and negotiations. Auto-creates Loop on /start.",
    status: "Needs API Key",
    envKey: "TELEGRAM_BOT_TOKEN",
    docs: "Code built: /api/webhooks/telegram — GET to auto-register webhook",
  },
  {
    name: "Slack App",
    description: "Get Loop updates in Slack channels. Assign tasks via @mention. Supports Events API and direct messages.",
    status: "Needs API Key",
    envKey: "SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET",
    docs: "Code built: /api/webhooks/slack — handles URL verification + messages",
  },
  {
    name: "Google Calendar",
    description: "Your Loop books appointments directly on your Google Calendar. OAuth flow, event creation, availability check.",
    status: "Needs API Key",
    envKey: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (already set)",
    docs: "Code built: /api/integrations/google-calendar — GET events, POST create, OAuth callback",
  },
  {
    name: "Email Inbound",
    description: "Forward emails to your Loop. It reads, understands, auto-replies. Supports Resend, SendGrid, and Mailgun inbound parse.",
    status: "Needs API Key",
    envKey: "RESEND_API_KEY (for replies) + MX/webhook config",
    docs: "Code built: /api/webhooks/email-inbound — POST to receive, auto-generates AI reply",
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
              background: "white",
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
                    background: int.status === "Live" ? "#DCFCE7" : int.status === "Needs API Key" ? "#FEF3C7" : "#F1F5F9",
                    color: int.status === "Live" ? "#166534" : int.status === "Needs API Key" ? "#92400E" : "#475569",
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
