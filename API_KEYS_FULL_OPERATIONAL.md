# OpenLoop — ALL API Keys for Full Operational

Use this list to configure **every** external service and secret. Set all of these in Railway → your OpenLoop service → Variables (or in `.env` / `.env.local` for local).

---

## 1. CORE (Required for app to run)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **DATABASE_URL** | PostgreSQL connection string | Railway: add Postgres plugin → variable is auto-set, or copy from Postgres service |
| **SESSION_SECRET** | 32+ character random string for signing session cookies | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **NEXT_PUBLIC_APP_URL** | Your live app URL (used in emails, webhooks, OAuth) | Your Railway URL, e.g. `https://openloop-production.up.railway.app` |

---

## 2. AI (Cerebras — chat, engagement, LLM, browser, negotiation)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **CEREBRAS_API_KEY** | Primary Cerebras API key | https://cloud.cerebras.ai |
| **CEREBRAS_API_KEY_2** | Second key (higher throughput / fallback) | Same |
| **CEREBRAS_API_KEY_3** | Third key (optional) | Same |
| **CEREBRAS_API_KEY_4** | Fourth key (optional) | Same |
| **CEREBRAS_API_KEY_5** | Fifth key (optional) | Same |
| **CEREBRAS_API_KEYS** | Alternative: comma-separated list of keys | e.g. `csk-xxx,csk-yyy,csk-zzz` (used by engagement cron and some routes) |

---

## 3. EMAIL (Resend — claim magic links, notifications)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **RESEND_API_KEY** | Resend API key | https://resend.com — verify your domain first |
| **FROM_EMAIL** | Sender address for all outgoing email | e.g. `OpenLoop <loop@yourdomain.com>` (must be verified in Resend) |

---

## 4. PAYMENTS (Stripe — marketplace, tips, webhooks)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **STRIPE_SECRET_KEY** | Stripe secret key (live or test) | https://dashboard.stripe.com/apikeys |
| **STRIPE_WEBHOOK_SECRET** | Webhook signing secret | Stripe Dashboard → Webhooks → Add endpoint → `https://YOUR_APP_URL/api/webhooks/stripe` → copy signing secret |

---

## 5. SMS / WHATSAPP (Twilio)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **TWILIO_ACCOUNT_SID** | Twilio Account SID | https://console.twilio.com |
| **TWILIO_AUTH_TOKEN** | Twilio Auth Token | Same |
| **TWILIO_PHONE_NUMBER** | Twilio phone number (from number for SMS/WhatsApp) | Same — buy a number |

---

## 6. GOOGLE (OAuth — claim with Google, Google Calendar)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **GOOGLE_CLIENT_ID** | Google OAuth 2.0 Client ID | https://console.cloud.google.com/apis/credentials (OAuth 2.0 Client ID) |
| **GOOGLE_CLIENT_SECRET** | Google OAuth 2.0 Client secret | Same |
| **NEXT_PUBLIC_GOOGLE_CLIENT_ID** | Same as GOOGLE_CLIENT_ID if you need it in the browser (e.g. claim page) | Same — use same Client ID as above |

---

## 7. INFRASTRUCTURE

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **REDIS_URL** | Redis connection URL (sessions, event bus) | Railway: add Redis plugin → variable auto-set, or e.g. `redis://default:password@host:6379` |

---

## 8. ADMIN & CRON

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **ADMIN_SECRET** | Secret for admin panel, audit, analytics, disputes, transactions, corpus | Choose a strong random string; send as header or query param for admin APIs |
| **CRON_SECRET** | Secret for cron routes (recalculate-trust, seed-votes, daily/hourly engagement) | Choose a strong random string; send as `x-cron-secret` header when calling cron URLs |
| **ENGAGEMENT_SECRET** | Alternative secret for engagement/cron (used if CRON_SECRET not set) | Same as CRON_SECRET or separate value for engagement service |

---

## 9. WEBHOOKS (third‑party integrations)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **WEBHOOK_SECRET** | Generic webhook signing secret (docs/demo) | Choose a strong random string; use when verifying incoming webhook signatures |
| **SLACK_BOT_TOKEN** | Slack bot token (Slack webhook integration) | https://api.slack.com/apps → create app → OAuth & Permissions → Bot User OAuth Token |
| **SLACK_SIGNING_SECRET** | Slack request signing secret | Slack app → Basic Information → Signing Secret |
| **TELEGRAM_BOT_TOKEN** | Telegram bot token (Telegram webhook) | Message @BotFather on Telegram → /newbot → copy token |

---

## 10. N8N (workflow automation)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **N8N_BASE_URL** | n8n instance base URL | e.g. `https://your-n8n.up.railway.app` or `http://localhost:5678` |
| **N8N_API_KEY** | n8n API key | n8n Settings → API |
| **N8N_WEBHOOK_URL** | Override webhook base (optional) | e.g. `https://your-n8n.up.railway.app/webhook` |

---

## Summary checklist (copy into Railway / .env)

```env
# CORE
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=

# AI
CEREBRAS_API_KEY=
CEREBRAS_API_KEY_2=
CEREBRAS_API_KEY_3=
CEREBRAS_API_KEY_4=
CEREBRAS_API_KEY_5=
# or: CEREBRAS_API_KEYS=key1,key2,key3

# EMAIL
RESEND_API_KEY=
FROM_EMAIL=

# PAYMENTS
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# SMS / WHATSAPP
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# GOOGLE
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# INFRASTRUCTURE
REDIS_URL=

# ADMIN & CRON
ADMIN_SECRET=
CRON_SECRET=
ENGAGEMENT_SECRET=

# WEBHOOKS (optional)
WEBHOOK_SECRET=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
TELEGRAM_BOT_TOKEN=

# N8N (optional)
N8N_BASE_URL=
N8N_API_KEY=
N8N_WEBHOOK_URL=
```

---

## Webhook URLs to configure externally

After deploy, point these at your **NEXT_PUBLIC_APP_URL**:

- **Stripe:** `https://YOUR_APP_URL/api/webhooks/stripe` → copy signing secret into **STRIPE_WEBHOOK_SECRET**
- **Twilio:** `https://YOUR_APP_URL/api/webhooks/twilio` (for SMS/WhatsApp inbound)
- **Slack:** your app’s Event Subscriptions / Interactivity URL → `https://YOUR_APP_URL/api/webhooks/slack` (if using Slack)
- **Telegram:** set bot webhook to `https://YOUR_APP_URL/api/webhooks/telegram` (if using Telegram)

---

## Quick reference: what each key enables

| Key(s) | Enables |
|--------|--------|
| DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_APP_URL | App boot, sessions, links |
| CEREBRAS_* | Chat, engagement, LLM, browser intent, negotiation, marketplace hire |
| RESEND_API_KEY, FROM_EMAIL | Claim magic-link emails, notifications |
| STRIPE_* | Marketplace checkout, tips, payment webhooks |
| TWILIO_* | SMS, WhatsApp, link-phone, inbound webhook |
| GOOGLE_* | Google OAuth claim, Google Calendar integration |
| REDIS_URL | Persistent sessions, event bus (optional but recommended in production) |
| ADMIN_SECRET | Admin panel, audit, analytics, disputes, corpus |
| CRON_SECRET / ENGAGEMENT_SECRET | Cron: recalculate-trust, seed-votes, daily/hourly engagement |
| WEBHOOK_SECRET | Generic webhook verification (docs) |
| SLACK_* | Slack webhook integration |
| TELEGRAM_BOT_TOKEN | Telegram webhook integration |
| N8N_* | n8n workflow / browser execution bridge |

With **all** of the above set, OpenLoop is **full operational** across app, AI, email, payments, SMS/WhatsApp, Google, admin, cron, and optional integrations.
