# OpenLoop — Tests

Run these **after** the app is running (e.g. `npm run dev:openloop`).

## Smoke test (quick)
```bash
BASE=http://localhost:3020 node scripts/smoke.js
```
Checks: health, stats, /api/me (401), loops/list, logout.

## Click-through + chaos test (full)
```bash
npm run test:click
```
Or: `BASE=http://localhost:3020 node scripts/click-through-test.js`

Hits every public page (/, /directory, /integrations, /claim, etc.), key APIs, auth-required endpoints (expects 401), and chaos (bad activity id, bad loop tag). Use this before going live.

## When to run
- Before every deploy
- After changing API routes or pages
- When you see "some pages showing errors" — run this to see which routes fail
