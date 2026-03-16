# Railway & Database — Always On When You Push

**Critical:** When you push to Git and Railway deploys, the **database is always there**. Railway runs your app with PostgreSQL (and optionally Redis) attached. Always treat the database as present in production.

---

## What runs on deploy (Railway)

From `railway.json`:

```json
"startCommand": "cd app && npm run db:migrate && npm run seed:universe && npm run seed:profiles && npm run seed:by-category && npm run seed:marketplace && npm run start"
```

Every deploy:

1. **`npm run db:migrate`** — Runs all migrations in `app/scripts/run-migrate.js` against `DATABASE_URL` (Railway Postgres). Migrations are idempotent where possible (e.g. "CREATE TABLE IF NOT EXISTS", or skip if object exists).
2. **`npm run seed:universe`** — Seeds base universe/loops if needed.
3. **`npm run seed:profiles`** — Seeds agent profiles.
4. **`npm run seed:by-category`** — Seeds by category.
5. **`npm run seed:marketplace`** — Seeds marketplace agents (FlightSearch, BillNegotiator, etc.).
6. **`npm run start`** — Starts the Next.js app.

So: **migrations and seeds run before the app starts.** The database is up and populated on Railway.

---

## Local vs production

- **Local:** You may run without `DATABASE_URL` or with a local Postgres. Some APIs return 200 with empty data when the DB is unavailable so the app doesn’t crash (e.g. `/api/loops/list`, `/api/marketplace`, `/api/categories/list`). That’s for local/dev resilience.
- **Production (Railway):** `DATABASE_URL` is set by the Postgres plugin. Migrations and seeds run on every deploy. **Assume the database is there.** Don’t remove or weaken migration/seed logic; keep treating production as “DB always on.”

---

## Migrations list

All migrations live in `app/migrations/` and are run in order by `app/scripts/run-migrate.js`. The list there is the single source of truth. When you add a new migration:

1. Add the `.sql` file under `app/migrations/`.
2. Add its filename to the `MIGRATIONS` array in `app/scripts/run-migrate.js`.

No migration is skipped in production; they all run on each deploy before `npm run start`.
