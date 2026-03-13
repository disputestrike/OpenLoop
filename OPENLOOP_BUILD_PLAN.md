# OPENLOOP — Build Plan & Implementation Steps

Step-by-step plan to go from zero to a working OpenLoop. Use this as the execution checklist. References: OPENLOOP_MASTER_DOCUMENT.md, OPENLOOP_DATABASE_AND_DEPLOYMENT.md, OPENLOOP_PRODUCT_AND_EXPERIENCE.md. Reviewer feedback and what we took: OPENLOOP_FEEDBACK_RESPONSE.md.

---

## Phase 0 — Foundation (Ship something people can use)

**First ship = one killer feature** (e.g. bill negotiation or scheduling) so we ship fast; then we add the rest. **Vision is unchanged:** Loop does **everything** — schedule, email, find deals, check email, multi-channel, proactive, directory — everything OpenClaw and Moltbook can do, **plus** our economy layer. Full agent + economy; we build it all. See Master Doc "Full agent + economy (non-negotiable scope)."

### Step 1: Project + Railway + DB
- [ ] Create repo (e.g. `openloop` or `openloop-app`). Node/TS or your stack.
- [ ] Railway: New project → Add **PostgreSQL** → Add **Redis** → Note `DATABASE_URL`, `REDIS_URL`.
- [ ] Add **backend service** (e.g. Node + Express/Fastify or Next.js API routes). Connect to Postgres + Redis. Deploy to Railway; env vars from Railway.
- [ ] Health check: `GET /health` returns 200 when DB and Redis are reachable.

### Step 2: Database schema (Postgres)
- [ ] Run migrations from OPENLOOP_DATABASE_AND_DEPLOYMENT.md §4 and §8 (feedback addendum):
  - `humans` (id, email, kyc_status, created_at, updated_at)
  - `loops` (id, human_id, loop_tag nullable, email, status, role, trust_score, sandbox_balance_cents, real_balance_cents, currency, skills jsonb, real_capable, created_at, claimed_at, updated_at)
  - `claim_links`, `transactions`, `trust_score_events`, `sandbox_activity`; optional: `disputes`
- [ ] Indexes: `loops.status`, `loops.loop_tag` (unique, nullable ok), `loops.trust_score`, `loops.skills` (GIN for matching), `claim_links.token` (unique).

### Step 3: Create-your-own flow (simplest path first)
- [ ] **POST /api/loops** (or /api/signup): body `{ email }`. Create `human` (or find by email), create **new Loop** (status = `pending_claim`, role = buyer), create `claim_link` (token, 48h expiry). Send email with link `https://yourapp.com/claim?token=...`. Return `{ success, message: "Check your email" }`.
- [ ] **GET /api/claim?token=...**: Validate token (exists, not expired, not used). Mark claim_link.used_at, set loop.human_id, loop.status = `active`, loop.claimed_at, loop.email. Redirect to app (e.g. /dashboard) or return JWT/session.
- [ ] Email: Use Resend, SendGrid, or Railway add-on. Simple template: "Claim your Loop: [link]".

### Step 4: Claim-existing flow (smart assignment preferred)
- [ ] **Smart assignment:** POST /api/loops/match (body: `{ intent: "Bills" | "Scheduling", email }`). Find unclaimed Loop with high trust_score and matching `skills` (e.g. intent "Bills" → skills contains "bill_negotiation"). Return one Loop: "We found a Loop with 92/100 trust. Claim it?" Then POST /api/loops/claim with loop_id + email; user sets loop_tag after claim.
- [ ] **GET /api/loops/unclaimed**: Optional browse (filter by role, trust_score). Paginate. For MVP seed a small set (e.g. 100 Loops).
- [ ] Landing: "Create your own" → Step 3. "Claim a Loop" → intent picker + smart match, or browse.

### Step 5: Auth and session
- [ ] After claim (or create + claim): create session (JWT or Redis session id). Middleware: protect `/dashboard`, `/api/me`.
- [ ] **GET /api/me**: Return current human + their Loop(s) (loop_tag, trust_score, role).

### Step 6: Frontend (minimal)
- [ ] Landing page: hero, "Get your Loop" → two CTAs: **Create your own** (email input → POST /api/loops) and **Claim a Loop** (link to /claim-browse or "Assign me one").
- [ ] Claim link page: /claim?token=... → call GET /api/claim?token=... → redirect to /dashboard.
- [ ] Dashboard (after login): Show Loop tag, trust score, "Your Loop is ready." (No LLM yet — just structure.)

### Step 7: Seed data (seeder script — no live LLMs)
- [ ] **Seeder script:** Insert N unclaimed Loops (e.g. 100 for MVP, or 100K when ready) with role, status = `unclaimed`, loop_tag = NULL, skills = e.g. `["bill_negotiation"]` or `["scheduling"]`, trust_score = varied (30–95), sandbox_balance_cents. Generate synthetic `trust_score_events` and `sandbox_activity` rows so each Loop has history. **Do not run live LLM for unclaimed Loops** — only when a human claims do we attach the agent to Cerebras/Llama.
- [ ] So "Claim a Loop" has data; smart assignment can match by intent + skills.

---

## Phase 0.5 — LLM and agent feel (when foundation is solid)

### Step 8: Cerebras + Llama 3.1 8B
- [ ] Sign up / API key for Cerebras (or your chosen host for Llama 3.1 8B).
- [ ] Backend: **POST /api/chat** or /api/loop/ask: receive message, call Cerebras (Llama 3.1 8B), return reply. Optional: store last N messages per Loop in Redis or DB.
- [ ] Dashboard: Simple chat UI — user talks to "their Loop." No tools yet; just conversational Loop.

### Step 9: Loop personality and onboarding copy
- [ ] System prompt for Loop: "You are Loop, the user's agent. Be concise. Help with scheduling, questions, next steps." Onboarding message: "Want your own Loop? Give me your email and I'll set you up."
- [ ] Landing: Replace static hero with a single "Talk to Loop" input (email or first message) so it feels agent-driven.

---

## Phase 1 — Trust, directory, and protocol

### Step 10: Trust Score and sandbox (simplified)
- [ ] Add `trust_score_events` and/or update `loops.trust_score` when you have events (e.g. "completed a task"). For MVP: manual or script that sets trust_score on seeded Loops.
- [ ] Dashboard: Show Trust Score (0–100) and badge "Verified human."

### Step 11: Loop directory (discovery)
- [ ] **GET /api/loops** (public): List Loops (claimed, with loop_tag) for discovery. Filter by trust_score, role. So people can find other Loops.
- [ ] Page: /loop/:tag — public profile (loop_tag, trust_score, "Verified"). Shareable URL.

### Step 12: OpenLoop Protocol (API for agents)
- [ ] Document: OpenLoop Agent API (auth via API key or JWT for Loop). Endpoints: get profile, send message, list transactions (when you have them).
- [ ] External agents can authenticate as a Loop and call the same backend (e.g. for scheduling, discovery).

---

## Phase 2 — Transactions and scale

### Step 13: Transactions and sandbox activity
- [ ] Tables: `transactions`, `sandbox_activity`, `trust_score_events` (see OPENLOOP_DATABASE_AND_DEPLOYMENT.md). Record deals and sandbox completions; update trust_score.
- [ ] Logic: When two Loops "deal," insert transaction, update trust_score_events and loops.trust_score.

### Step 14: 100K seed (when ready)
- [ ] Script: Generate 100K buyer Loops + 100K seller Loops (status = unclaimed). Run sandbox simulator (or background jobs) to populate trust_score and history. Then claim flow has a real pool.

### Step 15: Admin and safety
- [ ] Admin route (e.g. /admin): List Loops, transactions, trust distribution. Optional: override trust, suspend Loop. Auth: admin-only (e.g. env ADMIN_SECRET).

---

## Order of operations (summary)

| Order | What | Outcome |
|-------|------|---------|
| 1 | Railway + Postgres + Redis + backend | App deploys, DB and Redis connected |
| 2 | Schema (humans, loops, claim_links) | Tables exist |
| 3 | Create-your-own + claim link + email | User can get a Loop via email |
| 4 | Claim-existing (list unclaimed, reserve, claim link) | User can claim a pre-created Loop |
| 5 | Auth/session + /api/me | Logged-in user sees their Loop |
| 6 | Landing + dashboard + claim page | Minimal but usable UI |
| 7 | Seed 100–200 unclaimed Loops | Claim path has data |
| 8 | Cerebras + Llama 3.1 8B + chat | Loop can "talk" |
| 9+ | Trust, directory, protocol, transactions, 100K seed, admin | Full vision in steps |

---

## Tech stack (from docs)

- **Hosting:** Railway (app + Postgres + Redis).
- **Backend:** Node/TS or Next.js API; Postgres (Drizzle, Prisma, or raw SQL); Redis (sessions, cache).
- **LLM:** Cerebras + Llama 3.1 8B (when you add chat).
- **Email:** Resend, SendGrid, or Railway add-on.
- **Frontend:** Next.js or React + Vite; deploy same repo or separate on Railway.

---

## Ready check

- [ ] All docs in one place (master, database, product, research, this plan).
- [ ] No performance fees / no user payouts (revenue from advertising, enterprise, sponsors).
- [ ] Two paths: create your own + claim existing (first 100K only).
- [ ] Same sandbox money and KYC for both; no paywall.

Yes — we're ready to build. Start with Step 1.
