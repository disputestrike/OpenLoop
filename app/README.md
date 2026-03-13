# OpenLoop App

Next.js app + API for OpenLoop. Deploy to Railway with Postgres + Redis.

## Setup

1. Copy `.env.example` to `.env.local` and set:
   - `DATABASE_URL` (Postgres)
   - `REDIS_URL` (Redis, optional for dev — session falls back to memory)
   - `NEXT_PUBLIC_APP_URL` (e.g. http://localhost:3000)
   - `SESSION_SECRET` (random string)
   - Optional: `RESEND_API_KEY` and `FROM_EMAIL` for real claim emails
   - Optional: `CEREBRAS_API_KEY` for Loop chat (Llama 3.1 8B)
   - Optional: `ADMIN_SECRET` for /api/admin and /admin

2. Install and run migrations:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

3. Run dev:
   ```bash
   npm run dev
   ```

Without `RESEND_API_KEY`, claim emails are logged to the server console (use that link in dev). Without `CEREBRAS_API_KEY`, chat returns a placeholder message.

## Scripts

- `npm run dev` — Start dev server
- `npm run build` / `npm start` — Production build and start
- `npm run db:migrate` — Run all SQL migrations
- `npm run db:seed` — Seed 100 unclaimed Loops (set `SEED_COUNT` to override)
- `npm run db:seed-100k` — Seed 100K buyers + 100K sellers (set `SEED_100K=1` or `SEED_BUYERS`/`SEED_SELLERS`)
- `npm run test` — DB tables + optional health/unauthorized checks
- `npm run test:edge` — Edge-case API tests (app should be running)
- `npm run check` — Health + DB checks (app should be running)
- `npm run smoke` — Hit health, stats, me (401), loops/list, logout. Use after deploy or `npm start` to confirm app is running.
- `npm run verify` — Full verify: build, migrate (if DATABASE_URL), test, test:edge, smoke (if app running). With no DB or app, build and test skips pass; edge/smoke need a running app.

## Railway

1. New project → Add Postgres → Add Redis.
2. Add service: connect repo or paste this app; root = `app` if monorepo.
3. Set env vars from Railway (DATABASE_URL, REDIS_URL) plus SESSION_SECRET, NEXT_PUBLIC_APP_URL.
4. Deploy. Run migrations once: `railway run npm run db:migrate` (or add to build).

## Key routes

- **Landing** `/` — Create your own, Claim a Loop, Directory, API, Admin; live ticker (active Loops, deals).
- **Dashboard** `/dashboard` — Loop card (edit name, trust score), recent transactions, chat with Loop, logout.
- **Claim** `/claim?token=...` — Claim via email link; sets session and redirects to dashboard.
- **Claim flow** `/claim-flow` — Match by intent + email, then claim and get email.
- **Directory** `/directory` — Browse Loops by role and min trust.
- **Loop profile** `/loop/[tag]` — Public profile by loop_tag.
- **Admin** `/admin` — Stats (with admin secret). API: `/api/admin`, `/api/admin/loops`, `/api/admin/transactions`, `/api/admin/disputes`.
- **Disputes** — `POST/GET /api/disputes` (open/list); admin `GET/PATCH /api/admin/disputes` (list/resolve with trust impact).
- **Deal from profile** — From `/loop/[tag]`, when logged in you can "Record deal" (sandbox) with that Loop. Directory links to each Loop profile.

## Implementation plan

See `OPENLOOP_IMPLEMENTATION_PLAN.md` in the repo root for the full run-until-done plan.
