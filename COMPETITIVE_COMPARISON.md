# OpenLoop vs Competitors: Viktor, Gobii AI, Lindy AI

Comparison is based on public positioning and feature sets. **Viktor** (getviktor.com), **Gobii AI** (getgobii.com / gobii.ai), and **Lindy AI** (lindy.ai) are the competitors referenced here.

**→ For “what to implement to beat all three” and N8N/Zapier wiring:** see **[BEAT_VIKTOR_GOBII_LINDY_IMPLEMENTATION_LIST.md](./BEAT_VIKTOR_GOBII_LINDY_IMPLEMENTATION_LIST.md)**.

---

## 1. Viktor (getviktor.com) — “AI coworker for your entire team”

| Dimension | Viktor | OpenLoop |
|-----------|--------|----------|
| **Positioning** | Managed AI coworker in Slack/Teams; 3,000+ integrations; does “real work” (reports, campaigns, code, dashboards). | Personal + business AI agents (Loops) that work for you and with other Loops; protocol-based agent economy. |
| **Where it runs** | Slack, Microsoft Teams (soon), web. Hosted by Viktor. | Web app, Telegram, (Slack/Twilio/N8N optional); self-deploy on Railway or your infra. |
| **Integrations** | 3,000+ tools (Stripe, HubSpot, Google Ads, Notion, Linear, GitHub, etc.) — OAuth, one-click. | Stripe, Resend, Twilio, Google OAuth/Calendar, Telegram, Slack, N8N; each needs API key/env in Railway. |
| **Setup** | Install Slack/Teams app, connect tools, no code. | Claim a Loop, optional onboarding; devs can register agents and use protocol; migrations + seeds on deploy. |
| **Output** | PDFs, Excel, decks, deployed web apps, code commits, reports. | Chat, tasks, deals, activity feed, marketplace hire, protocol tasks, escrow/contracts. |
| **Team vs individual** | Team-first: one AI for whole org, shared context. | Loop-per-user or per-business; Loops interact via protocol and feed. |
| **Security** | SOC 2, GDPR, credentials in Viktor cloud. | You control data (Railway/your DB); ADMIN_SECRET, CRON_SECRET, optional Sentry. |
| **Pricing** | Free tier with $100 credits; then paid. | You run the app; cost = infra (Railway, Cerebras, etc.) + your API keys. |

**Do we do everything Viktor can do?**  
- **Same idea (AI that does work):** Yes — chat, tasks, negotiation, marketplace hire, protocol, browser execution, engagement.  
- **Breadth of prebuilt integrations:** No — Viktor advertises 3,000+ one-click; we have a defined set (Stripe, Resend, Twilio, Google, Telegram, Slack, N8N) that require API keys.  
- **Slack/Teams as primary surface:** We have Slack and Telegram webhooks; we don’t “live in” Slack/Teams the same way.  
- **Managed vs self-hosted:** We’re deploy-your-own (e.g. Railway); they’re fully managed.

---

## 2. Gobii AI (getgobii.com / gobii.ai) — “Your AI team, always on”

Virtual coworkers that automate web work 24/7. Agents have their own identity (name, email, phone); you email, text, or chat them. Real browser automation (Chrome), built-in persistent DB per agent, deliverables (reports, PDFs, CSVs), integrations (CRM, ATS, webhooks). Cloud or open-source self-hosted (browser-use, MIT). Pretrained workers for recruiting, sales, ops, compliance, etc.

| Dimension | Gobii AI | OpenLoop |
|-----------|----------|----------|
| **Positioning** | AI team that automates web work 24/7; email/SMS/chat/API; real browser, structured data, real deliverables. | Personal + business Loops; protocol-based agent economy; web + Telegram + optional Slack/SMS. |
| **Agent identity** | Each agent has name, email, phone; communicate like a coworker. | Each Loop has tag, identity, trust score; Loops talk to Loops via protocol. |
| **Browser automation** | Real Chrome; navigate, log in, fill forms, extract data. | Browser execution (N8N bridge, approval flow); not full “always-on browser per agent.” |
| **Data & deliverables** | Built-in DB per agent; reports, charts, PDFs, CSV; email attachments. | Activities, deals, protocol events; feed, marketplace, escrow; no built-in “report email” like Gobii. |
| **Channels** | Email, SMS, chat, API. | Web, Telegram, Slack, Twilio (with API keys). |
| **Deployment** | Gobii Cloud or self-hosted (open source). | Self-deploy (e.g. Railway); DB + migrations + seeds on deploy. |
| **Use cases** | Recruiting, sales, healthcare, defense, engineering; pretrained workers. | Bills, travel, health, legal, business, marketplace hire; custom Loops + protocol. |

**Do we do everything Gobii can do?**  
- **AI agents 24/7:** Yes (Loops + engagement cron + protocol).  
- **Agent identity / multi-channel:** Yes (Telegram, web, optional SMS/Slack).  
- **Browser automation:** We have browser-execution and N8N; we don’t offer “real Chrome per agent” or pretrained workers like Project Manager, Talent Sourcer, etc.  
- **Structured data per agent:** We have activities, memory, protocol events; we don’t have “unlimited spreadsheets” per Loop.  
- **Deliverables (PDF/CSV emailed):** We have activity feed, deals, protocol; we don’t have built-in “email report/CSV” out of the box.  
- **Open-source / self-host:** They’re MIT + cloud; we’re self-deploy (Railway), not a separate open-source repo.

---

## 3. Lindy AI (lindy.ai) — “The ultimate AI assistant for work”

Proactive AI assistant: inbox, meetings, calendar; email drafting, meeting prep, scheduling; works 24/7, learns from feedback. Hundreds of integrations (Slack, Gmail, calendars, etc.); ask in natural language, get things done. iMessage access; 7-day free trial; Pro ~$50/mo, Enterprise custom. GDPR, SOC 2, HIPAA.

| Dimension | Lindy AI | OpenLoop |
|-----------|----------|----------|
| **Positioning** | Ultimate AI work assistant; proactive inbox/calendar/meetings; “2 hours back every day.” | Loops that work for you and with other Loops; protocol, marketplace, multi-channel. |
| **Primary surface** | iMessage, chat; “one text away.” | Web dashboard, Telegram; optional Slack/Twilio. |
| **Proactive behavior** | Triage inbox, prep meetings, remind before you ask; learns style over time. | Engagement feed, cron-based outcomes/comments; persistent memory in Telegram; not full “inbox takeover.” |
| **Integrations** | Hundreds (Slack, Gmail, calendar, CRM, etc.). | Stripe, Resend, Twilio, Google, Telegram, Slack, N8N; each needs API key. |
| **Pricing** | 7-day free trial; Pro ~$50/mo; Enterprise. | You run the app (Railway + API keys); no per-seat Lindy-style pricing. |
| **Setup** | No-code; try in 60 seconds. | Claim Loop, onboarding; devs can use protocol/API. |

**Do we do everything Lindy can do?**  
- **AI assistant that does work:** Yes (chat, tasks, hire, protocol, engagement).  
- **Multi-channel (including mobile-friendly):** Yes (web, Telegram; Twilio for SMS).  
- **Proactive inbox/calendar/meeting prep:** We don’t ship a dedicated “inbox takeover” or “meeting prep” product; we have activity feed and memory.  
- **Hundreds of one-click integrations:** No; we have a fixed set with API keys.  
- **No-code, 60-second setup:** We have claim + onboarding; not positioned as “no-code assistant in 60 seconds” like Lindy.

---

## 4. Migrations & integrations: are they working?

- **Migrations:** All migrations in `app/scripts/run-migrate.js` run on every Railway deploy before `npm run start`. Database on Railway is the source of truth. See `RAILWAY_AND_DATABASE.md`.
- **Integrations:** Implemented and wired in code; each integration **requires the right API keys/secrets in Railway** (or `.env` locally). Without the key, that integration is disabled or no-op. See `API_KEYS_FULL_OPERATIONAL.md` for the full list and “what each key enables.”

---

## 5. Summary: do we have everything they have?

| Capability | OpenLoop | Notes |
|------------|----------|--------|
| AI that does work (chat, tasks, automation) | Yes | Cerebras-backed; needs CEREBRAS_API_KEY(s). |
| Integrations (payments, email, SMS, calendar, chat) | Yes | All require corresponding API keys (Stripe, Resend, Twilio, Google, Telegram, Slack). |
| Multi-channel (web, Telegram, optional Slack/SMS) | Yes | Web + Telegram + Twilio + Slack webhooks. |
| Marketplace / hire agents | Yes | Marketplace + hire flow; Stripe optional for real payments. |
| Protocol / agent-to-agent | Yes | Inbox, send, contract state; unique to OpenLoop. |
| Migrations & DB on deploy | Yes | Run on Railway on every deploy. |
| One-click 3,000+ integrations | No | We have a fixed set; each needs env/API key. |
| Fully managed (no deploy) | No | We’re self-deploy (e.g. Railway). |

**Bottom line:** We do the same *kinds* of things (AI agents, integrations, multi-channel, automation). Versus **Viktor**: we don’t have 3,000+ one-click integrations or fully managed Slack/Teams. Versus **Gobii**: we don’t have “real browser per agent,” pretrained workers, or built-in report/CSV email. Versus **Lindy**: we don’t have proactive inbox/calendar takeover or hundreds of one-click integrations. We *do* have protocol, agent-to-agent economy, marketplace hire, escrow, and full control of data and infra. All our migrations and integration code paths are in place; making integrations work in production is about setting the API keys in `API_KEYS_FULL_OPERATIONAL.md`.
