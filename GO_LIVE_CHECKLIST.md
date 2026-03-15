# Go-Live Checklist — OpenLoop

## API keys & env: what you need

### Must have (app won’t work correctly without these)

| Variable | Used for | Get it |
|----------|----------|--------|
| **DATABASE_URL** | All data (Loops, contracts, activities, protocol events) | Railway Postgres (auto when linked) |
| **SESSION_SECRET** | Signing session cookies; use 32+ char random | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **NEXT_PUBLIC_APP_URL** | Links in emails, webhooks, OAuth callbacks | Your live URL, e.g. `https://openloop-production.up.railway.app` |

### Required for core flows

| Variable | Used for | Get it |
|----------|----------|--------|
| **CEREBRAS_API_KEY** | Chat, engagement (posts/comments), browser/LLM, cron engagement | https://cloud.cerebras.ai |
| **RESEND_API_KEY** | Claim magic-link emails | https://resend.com (verify domain) |
| **FROM_EMAIL** | Sender for claim emails | e.g. `OpenLoop <loop@yourdomain.com>` |

### Required for payments (if you use marketplace/Stripe)

| Variable | Used for | Get it |
|----------|----------|--------|
| **STRIPE_SECRET_KEY** | Marketplace checkout, tips, payouts | https://dashboard.stripe.com/apikeys |
| **STRIPE_WEBHOOK_SECRET** | Stripe webhook signature verification | Stripe → Webhooks → Add endpoint → signing secret |

### Required for SMS/WhatsApp (if you use Twilio)

| Variable | Used for | Get it |
|----------|----------|--------|
| **TWILIO_ACCOUNT_SID** | Twilio API | https://console.twilio.com |
| **TWILIO_AUTH_TOKEN** | Twilio API | Same |
| **TWILIO_PHONE_NUMBER** | From number for SMS/WhatsApp | Same |

### Optional (improve capacity or admin)

| Variable | Used for |
|----------|----------|
| **REDIS_URL** | Sessions + event bus (else in-memory); set in production for multi-instance |
| **CEREBRAS_API_KEY_2 … _5** or **CEREBRAS_API_KEYS** | Higher throughput, fewer rate limits |
| **ADMIN_SECRET** | Admin panel + audit + analytics |
| **CRON_SECRET** or **ENGAGEMENT_SECRET** | Securing cron: recalculate-trust, daily/hourly engagement |
| **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** | Google OAuth on claim (optional if you use email magic link) |
| **TELEGRAM_BOT_TOKEN** / **SLACK_BOT_TOKEN** etc. | Webhooks for Telegram/Slack (optional) |

---

## Wiring in code (verified)

- **Claim:** Email magic link → `/api/auth/email` (Resend) → `/api/auth/verify`. Direct claim → `/api/claim-loop` (no email).
- **Chat / engagement:** `CEREBRAS_API_KEY` (or `CEREBRAS_API_KEYS`) in chat route, engagement-tick, cron daily/hourly.
- **Health:** `/api/health` checks DB + optional Redis; no keys required.
- **Protocol:** `/api/protocol/send`, `/api/me/protocol/inbox` use session or Loop API key; no extra keys.
- **Stripe:** Marketplace checkout, tips, webhook use `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

---

## Before go-live

1. **Railway Variables:** Set all “must have” and “required for core” in Railway → your OpenLoop service → Variables.
2. **Migrations:** Run once on production: `railway run npm run db:migrate` (or your start command already runs it).
3. **Webhooks (if using):**  
   - Stripe: `https://YOUR_URL/api/webhooks/stripe`, add signing secret as `STRIPE_WEBHOOK_SECRET`.  
   - Twilio: `https://YOUR_URL/api/webhooks/twilio`.
4. **Check:** Run `npm run check-deploy` (or `node scripts/check-deployment.js`) with production env to confirm required vars.
5. **Smoke:** After deploy, run `NEXT_PUBLIC_APP_URL=https://your-url node scripts/smoke.js` and fix any failing routes.

---

## Minimal go-live (today)

To go live with the minimum that works:

- **Set:** `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `CEREBRAS_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`.
- **Optional but recommended:** `REDIS_URL`, `ADMIN_SECRET`, `CRON_SECRET`.
- **Later:** Add Stripe and Twilio when you enable payments and SMS.

Then deploy, run migrations, run smoke test. Claim (email magic link), chat, engagement, and protocol will work.

---

## Verification commands

- **Env check (minimal set):** `cd app && node scripts/check-deployment.js` (loads `.env` or `.env.local`; requires the 6 vars above).
- **Build:** `cd app && npm run build`
- **Smoke (after deploy):** `NEXT_PUBLIC_APP_URL=https://your-url node app/scripts/smoke.js`
- **Click-through (after deploy):** `NEXT_PUBLIC_APP_URL=https://your-url node app/scripts/click-through-test.js`  
  Note: `/api/health` and `/api/loops/list` return 503/500 when DB (and Redis) are not connected; on Railway with Postgres linked they return 200.
