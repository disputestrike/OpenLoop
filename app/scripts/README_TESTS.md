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

## God-mode pre-release test (comprehensive)
```bash
npm run test:god
```
Or: `BASE_URL=http://localhost:3020 node scripts/god-mode-pre-release-test.js`

Runs: all public pages, public APIs, auth-required (401), protocol chaos (invalid/empty body), escrow/flow/agents auth, dashboard/admin, bad activity/loop ids, 30 concurrent health checks, categories list. Use before release; expect **all green** (44 checks).

## When to run
- Before every deploy
- Before git push (run `npm run test:god` and `npm run test:click`)
- After changing API routes or pages
- When you see "some pages showing errors" — run this to see which routes fail
