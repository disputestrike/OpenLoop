# Env comparison: what you have vs full operational — exactly what’s left

## What you have (real, not mock)

| Variable | Status |
|----------|--------|
| DATABASE_URL | ✅ Real (Railway Postgres) |
| REDIS_URL | ✅ Real (Railway Redis) |
| CEREBRAS_API_KEY | ✅ Real |
| CEREBRAS_API_KEY_2 | ✅ Real |
| CEREBRAS_API_KEY_3 | ✅ Real |
| CEREBRAS_API_KEY_4 | ✅ Real |
| CEREBRAS_API_KEY_5 | ✅ Real |
| SESSION_SECRET | ✅ Real |
| NEXT_PUBLIC_APP_URL | ✅ Real |
| ADMIN_SECRET | ✅ Real |
| CRON_SECRET | ✅ Real |
| RESEND_API_KEY | ✅ Real |
| FROM_EMAIL | ✅ Real |
| GOOGLE_CLIENT_ID | ✅ Real |
| GOOGLE_CLIENT_SECRET | ✅ Real |
| NEXT_PUBLIC_GOOGLE_CLIENT_ID | ✅ Real |
| TELEGRAM_BOT_TOKEN | ✅ Real |

---

## What you have but is MOCK (must replace for full operational)

| Variable | Current value | What to do |
|----------|----------------|------------|
| **STRIPE_SECRET_KEY** | `sk_test_mock_disabled` | Replace with real key from https://dashboard.stripe.com/apikeys (use test `sk_test_...` or live `sk_live_...`) |
| **STRIPE_WEBHOOK_SECRET** | `whsec_mock_disabled` | In Stripe Dashboard → Webhooks → Add endpoint → URL `https://openloop-production.up.railway.app/api/webhooks/stripe` → copy the **Signing secret** (`whsec_...`) |
| **TWILIO_ACCOUNT_SID** | `AC_mock_disabled` | Replace with real SID from https://console.twilio.com (starts with `AC`) |
| **TWILIO_AUTH_TOKEN** | `mock_disabled` | Replace with real Auth Token from same Twilio console |
| **TWILIO_PHONE_NUMBER** | `+15550000000` | Replace with a real Twilio number you own (e.g. buy a number in Twilio) |

---

## Not in your list (optional — only if you use them)

| Variable | Needed only if |
|----------|-----------------|
| **ENGAGEMENT_SECRET** | Your engagement/cron caller uses this instead of CRON_SECRET; you already have CRON_SECRET so skip unless you want a separate secret for engagement. |
| **WEBHOOK_SECRET** | You verify generic incoming webhooks (docs/demo); add a random string if you use that. |
| **SLACK_BOT_TOKEN** | You use Slack webhook integration (`/api/webhooks/slack`). |
| **SLACK_SIGNING_SECRET** | Same Slack app. |
| **N8N_BASE_URL** | You use n8n workflow/browser bridge. |
| **N8N_API_KEY** | Same. |
| **N8N_WEBHOOK_URL** | Optional override for n8n webhook base. |

---

# Exactly what is left (action list)

To be **full operational** (no mocks), you only need to **replace these 5** with real values:

1. **STRIPE_SECRET_KEY** — Get from Stripe Dashboard → API keys. Set to `sk_test_...` or `sk_live_...`.
2. **STRIPE_WEBHOOK_SECRET** — Add webhook in Stripe to `https://openloop-production.up.railway.app/api/webhooks/stripe`, then paste the signing secret (`whsec_...`).
3. **TWILIO_ACCOUNT_SID** — From Twilio console (starts with `AC`).
4. **TWILIO_AUTH_TOKEN** — From same Twilio console.
5. **TWILIO_PHONE_NUMBER** — A Twilio number you own (buy one in Twilio if needed).

Everything else you listed is already real and good. Optional vars (Slack, N8N, WEBHOOK_SECRET, ENGAGEMENT_SECRET) only matter if you use those features.
