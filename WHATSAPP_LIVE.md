# Move to LIVE / Real WhatsApp (WhatsApp Business API)

You need **real** WhatsApp (not sandbox) so users can message your Loop from their WhatsApp app. Two main paths:

---

## Option 1: Twilio WhatsApp Business (recommended to go live fast)

Twilio can host your **WhatsApp Business** number and forward messages to your app. You still use the same webhook: `https://YOUR-APP-URL/api/webhooks/twilio`.

### Steps

1. **Twilio Console** → **Messaging** → **WhatsApp** → **Send and receive messages**.
2. **Sandbox** is for testing (join with a code). To go **live**:
   - Request a **WhatsApp Business Profile** and **phone number** (or use your own number) via Twilio.
   - Twilio will guide you through **Meta Business verification** and **WhatsApp Business API** approval. This can take a few days.
3. Once approved, you get a **live WhatsApp number**. In Twilio:
   - **Messaging** → **WhatsApp senders** → your number.
   - Set **Webhook URL** when a message comes in: `https://YOUR-APP-URL/api/webhooks/twilio` (POST).
4. Your app already handles Twilio webhooks (SMS and WhatsApp). No code change for “real” vs sandbox — only the Twilio sender changes from sandbox to your business number.
5. **Env:** Same as today: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`. For WhatsApp, Twilio uses the configured sender; you don’t need `TWILIO_PHONE_NUMBER` for WhatsApp replies (replies go via TwiML from the webhook).

### Summary

- **Sandbox:** Test only; users must “join” with a code.
- **Live:** Apply for WhatsApp Business via Twilio → get a real number → set webhook to `/api/webhooks/twilio` → done. Same app, same route.

---

## Option 2: Meta WhatsApp Cloud API (direct)

You can talk to Meta’s API directly instead of Twilio. Your app would expose a **different** webhook (e.g. `POST /api/webhooks/whatsapp-meta`) and use Meta’s format and Graph API to send replies.

### Steps

1. **Meta for Developers** → Create app → Add **WhatsApp** product.
2. **WhatsApp** → **API Setup** → Get a **phone number** (or connect your own after business verification).
3. **Webhook:** Set your app’s URL, e.g. `https://YOUR-APP-URL/api/webhooks/whatsapp-meta`. Meta sends a different payload (JSON with `entry[].changes[].value.messages` etc.). You must:
   - Verify the webhook (GET with `hub.mode`, `hub.verify_token`, `hub.challenge`).
   - Parse Meta’s JSON and send replies via **Graph API** (`POST /v18.0/PHONE_ID/messages` with access token).
4. **Env:** `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `META_APP_SECRET` (for signature verification).

We don’t have the Meta webhook route yet. If you choose this path, we add:
- `GET/POST /api/webhooks/whatsapp-meta` (verify + handle messages).
- A small client that calls Meta’s API to send the reply.

---

## What to do now

1. **Keep using the Twilio webhook** you have: `POST /api/webhooks/twilio`. It works for both SMS and Twilio-hosted WhatsApp (sandbox and, once approved, live).
2. **Go live on WhatsApp via Twilio:** Request WhatsApp Business through Twilio, get your number, set “When a message comes in” to `https://YOUR-APP-URL/api/webhooks/twilio`. No app code change.
3. **Optional later:** Add Meta Cloud API webhook if you want to move off Twilio or run both.

Your app is already “live-ready” for Twilio WhatsApp; the remaining step is business/API approval and pointing the **live** WhatsApp sender at the same URL.
