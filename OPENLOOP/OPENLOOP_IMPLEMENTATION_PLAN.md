# OPENLOOP — Full Implementation Plan (Run Until Done)

**Rule:** Once you say **go**, execution does not stop until every phase is complete. No further approval needed between phases. Complete Phase 0 → then Phase 0.5 → then Phase 1 → then Phase 2. Each phase has a **Done when** so we know we're finished.

**Definition of "end of it":** A user can land on the app, create or claim a Loop, claim via email, log in, talk to their Loop (chat), see Trust Score and directory, and (in Phase 2) transactions and admin exist. Database is migrated, backend and frontend deploy on Railway, seeder has run. All phases below are complete.

---

## Phase 0 — Foundation

**Done when:** User can (1) open the app, (2) choose "Create your own" or "Claim a Loop", (3) enter email and receive claim link, (4) click link and land on dashboard as owner of a Loop, (5) see their Loop tag and trust score. No LLM yet.

| Step | Task | Deliverable | Done when |
|------|------|--------------|-----------|
| 0.1 | Create project (Node/TS), add Railway project with Postgres + Redis | Repo with package.json, railway.toml or Dockerfile, .env.example | `GET /health` returns 200 with DB and Redis connected |
| 0.2 | Database migrations: humans, loops, claim_links, transactions, trust_score_events, sandbox_activity (and optional disputes) | SQL or Drizzle/Prisma migrations in repo | All tables exist; indexes on loops.status, loops.loop_tag, loops.trust_score, loops.skills (GIN), claim_links.token |
| 0.3 | Create-your-own: POST /api/loops (body: email), create human + pending Loop + claim_link, send email with claim URL | Working endpoint + email sent | User receives email with link; link contains valid token |
| 0.4 | Claim: GET /api/claim?token=... validates token, marks link used, sets loop.human_id, status=active, claimed_at, email; redirect to /dashboard; create session (JWT or Redis) | Claim endpoint + session | Clicking link logs user in and redirects to dashboard |
| 0.5 | Auth middleware: protect /dashboard and /api/me. GET /api/me returns current human + their Loop(s) | Auth working | Logged-in user can call /api/me and see their Loop |
| 0.6 | Claim-existing: POST /api/loops/match (intent, email) finds unclaimed Loop by skills + trust; POST /api/loops/claim (loop_id, email) reserves Loop, sends claim link | Match + claim endpoints | User can request "Bills" and get a Loop to claim via email |
| 0.7 | Frontend: Landing (Create your own + Claim a Loop), /claim?token=... page, /dashboard (show loop_tag, trust_score) | Deployed UI | User can complete full flow from browser |
| 0.8 | Seeder script: insert 100+ unclaimed Loops with role, skills, trust_score, sandbox_balance_cents; optional synthetic trust_score_events/sandbox_activity | Script in repo, run once | GET /api/loops/unclaimed returns Loops; match returns a Loop for intent |

**Phase 0 complete when:** All steps 0.1–0.8 are done and verified. User can create or claim a Loop and see dashboard.

---

## Phase 0.5 — LLM and agent feel

**Done when:** User can send a message to their Loop from the dashboard and receive a reply from Cerebras + Llama 3.1 8B. Chat history persisted (Redis or DB).

| Step | Task | Deliverable | Done when |
|------|------|--------------|-----------|
| 0.5.1 | Cerebras API key; backend POST /api/chat (loop_id, message) → call Cerebras (Llama 3.1 8B), return reply; store last N messages per Loop | Chat endpoint | Sending a message returns a reply |
| 0.5.2 | Dashboard: chat UI (input + message list). Call /api/chat on submit. Show Loop reply. | Chat in dashboard | User can talk to their Loop in the UI |
| 0.5.3 | System prompt and onboarding copy for Loop (concise, helpful, agent-driven). Landing hero: "Talk to Loop" feel. | Copy in code or config | Loop responds in character; landing feels agent-driven |

**Phase 0.5 complete when:** User can have a conversation with their Loop in the dashboard.

---

## Phase 1 — Trust, directory, protocol

**Done when:** Trust Score is visible (0–100) and explained; Loop directory (public list of Loops) exists; shareable URL /loop/:tag works and shows public profile.

| Step | Task | Deliverable | Done when |
|------|------|--------------|-----------|
| 1.1 | Trust Score: ensure loops.trust_score is returned in /api/me and in directory. Dashboard: show 0–100 and "Verified human" badge. Optional: trust_score_events used to show "Why this score?" | Trust in UI | User sees their score and badge |
| 1.2 | GET /api/loops (public): list claimed Loops with loop_tag, trust_score, role. Filter by trust_score, role. Paginate. | Directory API | Frontend can list Loops |
| 1.3 | Page /loop/:tag — fetch Loop by tag, show public profile (tag, trust score, Verified). Shareable; works without login. | Public profile page | openloop.app/loop/Ben (or similar) shows profile |
| 1.4 | OpenLoop Protocol doc: auth (API key or JWT for Loop), endpoints (get profile, send message, list transactions). Optional: simple API key per Loop for external agents. | Doc or /docs page | External client can auth and call API |

**Phase 1 complete when:** Trust is visible, directory works, shareable URL works, protocol is documented.

---

## Phase 2 — Transactions and scale

**Done when:** Transactions are recorded when two Loops deal; trust_score updates from events; seeder can create 100K Loops (run when ready); admin view exists (list Loops, transactions, trust distribution).

| Step | Task | Deliverable | Done when |
|------|------|--------------|-----------|
| 2.1 | Transaction flow: when two Loops complete a deal, insert into transactions; append trust_score_events; update loops.trust_score. Optional: sandbox_activity for completions. | Logic in backend | A completed deal updates DB and trust |
| 2.2 | Seeder for 100K: script that inserts 100K buyer + 100K seller Loops with varied trust_score and skills; generates synthetic trust_score_events and sandbox_activity. No live LLM. | Script runnable | DB has 100K unclaimed Loops with history |
| 2.3 | Admin: route /admin (or /api/admin) protected by ADMIN_SECRET. List Loops (search, filter), list transactions, trust distribution. Optional: override trust, suspend Loop. | Admin UI or API | Admin can view and manage |

**Phase 2 complete when:** Transactions and trust updates work; 100K seeder exists and can be run; admin can view Loops and transactions.

---

## Execution order (no stops)

1. **Phase 0:** Do steps 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → 0.6 → 0.7 → 0.8 in order. Verify "Done when" for each. Phase 0 complete → proceed.
2. **Phase 0.5:** Do 0.5.1 → 0.5.2 → 0.5.3. Phase 0.5 complete → proceed.
3. **Phase 1:** Do 1.1 → 1.2 → 1.3 → 1.4. Phase 1 complete → proceed.
4. **Phase 2:** Do 2.1 → 2.2 → 2.3. Phase 2 complete → **stop. You're at the end.**

---

## Tech stack (reminder)

- **Hosting:** Railway (app + Postgres + Redis).
- **Backend:** Node + Express/Fastify or Next.js API routes. Postgres (Drizzle, Prisma, or raw SQL). Redis (sessions, cache).
- **LLM:** Cerebras + Llama 3.1 8B for /api/chat.
- **Email:** Resend, SendGrid, or Railway add-on.
- **Frontend:** Next.js or React + Vite; same repo or separate.

---

## Where the code lives

- **Repo:** Create in OPENLOOP folder or new `openloop-app` folder. All code (backend, frontend, migrations, seeder) in one repo so we can deploy to Railway and run migrations and seeder from the same place.
- **References:** OPENLOOP_MASTER_DOCUMENT.md, OPENLOOP_DATABASE_AND_DEPLOYMENT.md, OPENLOOP_BUILD_PLAN.md, OPENLOOP_PRODUCT_AND_EXPERIENCE.md.

---

**When you say go:** Start at Phase 0, Step 0.1. Do not stop until Phase 2 is complete. No further approval needed between phases.

---

## Implementation status (built)

All phases are implemented in the `app/` directory:

- **Phase 0:** Project, migrations (001 + 002 chat_messages), create/claim flows, auth, session (Redis + memory fallback), match + claim-existing, landing + claim + claim-flow + dashboard, seeder.
- **Phase 0.5:** Cerebras + Llama 3.1 8B via `/api/chat`, `/api/chat/history`, dashboard chat UI, Loop system prompt.
- **Phase 1:** Trust Score and Verified in dashboard/directory; `GET /api/loops/list` and `GET /api/loops/by-tag/[tag]`; `/loop/[tag]` public profile; `/docs/protocol` API doc.
- **Phase 2:** `recordDeal()` and trust_score_events update; `POST /api/transactions/complete`, `GET /api/transactions`; `scripts/seed-100k.js` (SEED_100K=1 or SEED_BUYERS/SEED_SELLERS); `/api/admin`, `/api/admin/loops`, `/api/admin/transactions` (X-Admin-Secret or admin_secret); `/admin` UI.

**Tests:** `npm run test` (DB + health + unauth), `npm run test:edge` (claim invalid token, create no email, match, chat 401, admin 403, directory). **Check:** `npm run check` (health + DB).
