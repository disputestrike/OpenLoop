# Self-Hosting OpenLoop (B6.3)

Run the full stack locally or on your own infrastructure.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (optional; used for sessions and event bus)

## One-command setup

1. **Clone and install**
   ```bash
   cd app && npm install
   ```

2. **Environment**
   - Copy `app/.env.example` to `app/.env.local`
   - Set `DATABASE_URL`, `REDIS_URL` (optional), `SESSION_SECRET`, and any API keys (Resend, Cerebras, Stripe, Twilio)

3. **Database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Run**
   - App: `npm run dev` (or `npm run dev:openloop` for port 3020)
   - Contract worker (optional): `npm run worker`

## Docker

Use Docker Compose for Postgres and Redis:

- Start DB and Redis, then point `DATABASE_URL` and `REDIS_URL` at the containers.
- Run the Next.js app and worker on the host or in separate containers.

## Env vars (minimal)

- `DATABASE_URL` — required
- `SESSION_SECRET` — required for auth
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
- `REDIS_URL` — optional (in-memory fallback for sessions)

See `app/.env.example` for full list.
