# What You Need — OpenLoop v3

This doc lists what’s required so the app is **fully wired** (real DB, real emails, real agents) and what’s already working with **mock/demo** data when those aren’t set.

---

## Already working (no setup)

- **Homepage:** Live stats (Loops active, Deals completed) and recent activity use **mock data** when the database isn’t connected.
- **Dashboard:** If you’re not signed in, you see a clear “Get your Loop” / “Claim a Loop” CTA instead of a blank page or redirect.
- **Admin:** Use secret **`demo`** to see mock stats (Loops, deals, trust distribution). No env needed.
- **Directory, API docs, Claim flow, Trust page:** Pages exist and load; they need DB/auth for real data.

---

## To make everything “real”

### 1. Database (PostgreSQL)

- **Env:** `DATABASE_URL` (e.g. Supabase or any Postgres connection string).
- **Used for:** Loops, humans, claim_links, transactions, disputes, sessions (if using DB-backed session store).
- **Schema:** See `OPENLOOP_DATABASE_AND_DEPLOYMENT.md` (and any migrations in the repo). Core tables: `humans`, `loops`, `claim_links`, `transactions`, `disputes`.

Without this, stats and activity use mock data; “Create my Loop” and claim flow will fail when they hit the DB.

---

### 2. Admin panel (real data)

- **Env:** `ADMIN_SECRET` — any string you choose. Used in `/api/admin?admin_secret=...` or `X-Admin-Secret` header.
- **Behavior:** If set, only that secret returns real DB stats. If not set, using **`demo`** still returns mock stats so the Admin panel always shows something.

---

### 3. Emails (claim links)

- **Used in:** `POST /api/loops` — after creating a Loop we send a “Claim your Loop” link to the user’s email.
- **Implementation:** Check `@/lib/email` (e.g. `sendClaimEmail`). You need to plug in your provider (Resend, SendGrid, etc.) and the right env vars (e.g. `RESEND_API_KEY`, `FROM_EMAIL`).
- **Until then:** “Create my Loop” may 500 or skip sending; user won’t get the claim link.

---

### 4. App URL (for links in emails)

- **Env:** `NEXT_PUBLIC_APP_URL` — e.g. `https://openloop.example.com` or `http://localhost:3000`.
- **Used for:** Claim link URL in the email and redirects after claim.

---

### 5. Optional: Redis (sessions)

- **Used for:** Storing session tokens (so login survives restarts). See `@/lib/redis` and `@/lib/session`.
- **If not set:** Sessions fall back to in-memory store (works for single process; lost on restart).

---

### 6. Optional: API keys for agents/LLMs

- The **Master Document** and product docs describe Cerebras, Claude, etc. for the agent runtime. Those keys are for the **backend agent service** (orchestration, voice, tools), not for the Next.js app itself.
- For the **current app**, no LLM/agent API keys are required to run the UI, stats, admin, or claim flow. When you add the real agent backend, you’ll add those keys to that service (or to env used by API routes that call it).

---

## Your blog / “deals done” content

You mentioned a **blog that shows everything / deals done**. To integrate it:

- **Option A:** Share the **URL** (or a short list of links). We can add a “Blog” or “Deals” link in the nav/footer and, if you want, a section on the homepage that links to or embeds it.
- **Option B:** If the content is in the repo (e.g. markdown or CMS), tell me where it is and how you want it shown (e.g. `/blog`, or “Deals” page), and I’ll wire that route and any needed data.

---

## Quick checklist

| Item                     | Env / action              | Status without it              |
|--------------------------|---------------------------|---------------------------------|
| DB                       | `DATABASE_URL`            | Mock stats & activity          |
| Admin (real)             | `ADMIN_SECRET`            | Use `demo` for mock admin      |
| Claim emails             | Email provider in `@/lib/email` | Claim flow can’t send link  |
| App URL                  | `NEXT_PUBLIC_APP_URL`     | Claim link may point to wrong host |
| Redis                    | Redis URL in `@/lib/redis`| In-memory sessions             |
| Blog / deals link        | Your URL or content path  | Not linked yet                 |

---

## Where things are wired

- **Stats (Loops active, deals done):** `app/src/app/api/stats/route.ts` — uses DB when `DATABASE_URL` is set; otherwise returns mock counts.
- **Activity feed:** `app/src/app/api/activity/route.ts` — uses DB for real transactions; fills with placeholders when DB fails or is missing.
- **Admin:** `app/src/app/api/admin/route.ts` — accepts `ADMIN_SECRET` or `demo`; returns DB stats or mock.
- **Create Loop:** `app/src/app/api/loops/route.ts` — inserts into DB and sends email; needs DB + email.
- **Claim Loop:** `app/src/app/api/claim/route.ts` — reads claim_links, updates loops/humans, sets session cookie; needs DB.
- **Dashboard / Trust:** `app/src/app/api/me/route.ts`, chat, transactions — need DB and a valid session (after claim).

If you tell me your blog URL or where the “deals done” content lives, I can add the links and any extra wiring next.
