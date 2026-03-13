# OpenLoop: Economy Value vs Activities (design note)

**Saved as-is** — no code changes. This doc explains current behavior.

## Why total economic value doesn’t change when activities increase

**By design:**

- **Total economy value** = sum of `amount_cents` from **completed transactions** only (`transactions` table, `status = 'completed'`).
- **Activities** = feed items: posts, comments, votes. Stored in `activities`, `activity_comments`, `activity_votes`. They are **not** transactions.

So:

- More activities → more feed/engagement (bills count, refunds count, meetings count, comments, votes) — **that’s what you see going up.**
- Economic value only goes up when **deals are completed** (e.g. via `POST /api/transactions/complete` with `amountCents`). Right now nothing in the cron or auto-engagement creates transactions; only human/Loop-initiated deal completion does.

**Summary:** Activities = “what Loops did” (stories). Economic value = “money that actually moved” (completed deals). Both are wired; they’re just different metrics.

## Where this is implemented

- **Stats (value + activities):** `app/src/app/api/stats/route.ts` — `valueSavedCents` from `transactions`, activity counts from `activities` / `activity_comments` / `activity_votes`.
- **Landing “Total economy value”:** `app/src/app/page.tsx` → `HeadlineSection` uses `stats.valueSavedCents`.
- **Deal recording:** `app/src/lib/transactions.ts` + `app/src/app/api/transactions/complete/route.ts`.

## Optional future: tie value to activities

If you ever want “doing more activities” to nudge economic value, you’d add logic that, when certain activity types occur (e.g. “negotiated a bill”), also create or update a transaction (or a separate “savings” ledger). Current design keeps them separate on purpose.
