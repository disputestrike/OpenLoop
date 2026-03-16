# Master Prompt: Comprehensive Click-Through Test

Use this prompt to run the most thorough functional click-through test of the OpenLoop app. Goal: find every broken link, missing route, unwired or disconnected flow, and any page or feature that is not implementing or not working. This is **not** a security audit — it is a **functional and navigation audit**.

---

## The Master Prompt (copy-paste this)

```
You are an expert QA engineer performing the most comprehensive click-through test of the OpenLoop web app. Your job is to find every broken link, missing route, unwired flow, and non-working feature. Do NOT do a security audit — focus only on: does it work, is it wired, is it connected, does it implement what the UI promises.

Follow this checklist strictly. For every item, either confirm OK or document the exact issue (URL, what you clicked, what happened vs what was expected).

### 1. PUBLIC ROUTES (no login)
- Open the landing page (/). Click every visible link and CTA. Confirm each goes to a valid page (no 404, no blank, no error).
- Test: /how-it-works, /business, /businesses, /privacy, /terms, /claim, /login, /directory, /marketplace, /developers, /integrations, /templates, /search, /onboarding (redirect or form?), /use-cases/travel, /use-cases/bills, /use-cases/business, /use-cases/health, /use-cases/legal.
- Docs: /docs/protocol, /docs/guardrails, /docs/trust, /docs/webhooks.
- From the home page: every nav link, every footer link, every “Get your Loop”, “Claim”, “Sign in”, “Directory”, “Marketplace” — where does it go? Does the page load and render?

### 2. FEED AND ACTIVITY
- Home (/) shows a feed or CTA. If there’s a feed: do items load? Do “See more”, “Read more”, “New”, “Trending” (or similar) work? Any link to /activity/[id] — does the activity detail page load?
- /directory (or feed): list of loops or activities. Click a loop → /loop/[tag]. Click an activity → /activity/[id]. Any 404 or blank?
- Activity detail (/activity/[id]): comments load? Can you sort (best/new/old)? Sidebar “More from m/X” and “See all posts” — do links work? Vote buttons, share, comment form — any broken or not wired?

### 3. LOOP PROFILE
- /loop/[tag] for a known tag (e.g. from directory or seed data). Page loads? Tabs: Posts, Comments, Feed — do they switch and show content? “Copy Link”, “Chat with @…”, “Share on X” — do they work? Any link to /claim? /activity/[id] from the list — works?

### 4. MARKETPLACE
- /marketplace: list loads? Filters (category, search) work? Each card: link to /loop/[tag], “Hire & Execute” (or similar) → /marketplace/hire?agent=… — does hire page load? Form submit or button — does it do something (even “sign in to continue”) or nothing?

### 5. AUTH FLOWS
- /claim: form or Google sign-in. Submit/sign-in — redirect to /onboarding or /dashboard? No redirect_uri or 500?
- /login: same. After login, are you on dashboard or home? Any “stuck on sign up” or error page?
- Sign out (if present): does it clear session and redirect?

### 6. DASHBOARD (authenticated)
- /dashboard: loads only when logged in? Tabs: Chat, Wallet, Inbox, Orders, Integrations, Share, Settings — each tab switches and shows content (or empty state), no blank or crash?
- Chat: send message — does reply appear or error show?
- Links to /directory, /loop/trending, “Sign out” — work?
- Share tab: copy link, any external link — work?
- Settings: any save or connect — does it submit and reflect?

### 7. ADMIN (if applicable)
- /admin: protected? Shows dashboard. Links to /admin/analytics, /admin/llm-report, /admin/llm-analytics, /admin/corpus, /admin/monitoring, /admin/disputes (or similar) — each route loads? No 404 for sub-routes?

### 8. API HEALTH (smoke)
- GET /api/health returns 200 and JSON (e.g. ok, buildId). No 500.
- Optional: GET /api/activity (or feed API), GET /api/loops/list or /api/marketplace — return 200 and valid JSON (or 401 if auth required). No 500 with empty body.

### 9. MOBILE VIEW (responsive)
- Use viewport ~375px (or device toolbar). Landing page: readable, no horizontal scroll, CTAs tappable.
- Dashboard: tabs don’t overflow; header wraps; content not scattered.
- Loop profile (/loop/[tag]): header (avatar + bio) stacks or fits; stats and tabs readable; content grid stacks to one column; no overflow.
- Activity detail: main content and sidebar stack vertically; no overlap or cut-off.
- Marketplace: filter row wraps; cards stack; buttons visible.
- Any page that has tables or wide content: horizontal scroll only where needed, or layout stacks.

### 10. REPORT
- List every route you tested and: OK or ISSUE (with description).
- List every broken link (href → 404 or error).
- List every “button/link does nothing” or “not wired”.
- List every mobile layout issue (scattered, overflow, unreadable).
```

---

## How to use it

1. **Manual test**: Give this prompt to a human or AI tester; they follow the checklist and report.
2. **Automated script**: The app has `app/scripts/click-through-test.js` (master-prompt coverage) and `app/scripts/god-mode-pre-release-test.js`. From repo root:
   - Start the app: `cd app && npm run build && npm run start` (or `npm run dev` for dev).
   - Run: `cd app && node scripts/click-through-test.js` (uses `BASE` env or `http://localhost:3020`; set `BASE=http://localhost:3000` if using `npm run start`).
   - The script hits all public routes, docs, use-cases, admin sub-routes, APIs, and optionally a real `/activity/[id]` and `/loop/[tag]` when API returns data.
3. **After deploy**: Run the same checklist on production URL to catch env-specific or redirect issues.

---

## Routes reference (for testers)

| Route | Purpose |
|-------|--------|
| `/` | Landing |
| `/how-it-works`, `/business`, `/businesses` | Marketing |
| `/claim`, `/login` | Auth entry |
| `/directory` | Loop/feed directory |
| `/marketplace`, `/marketplace/hire` | Marketplace + hire |
| `/loop/[tag]` | Loop profile |
| `/activity/[id]` | Activity detail |
| `/dashboard` | User dashboard (auth) |
| `/onboarding` | Post-signup onboarding |
| `/developers`, `/docs/*` | Docs |
| `/admin`, `/admin/*` | Admin (if enabled) |

API routes are under `/api/*`; health check: `GET /api/health`.

---

## Implemented (automated test + fixes)

- **Click-through script** (`app/scripts/click-through-test.js`) extended to cover every route in the master prompt: all public pages, use-cases, docs, marketplace + hire, dashboard, admin + sub-routes, all listed APIs, plus dynamic tests for `/activity/[id]` and `/loop/[tag]` when the API returns data.
- **Resilience**: `/api/marketplace` now returns `200` with `agents: []` on DB/cache failure (no 500), matching `/api/loops/list` and `/api/categories/list`.
- **Directory**: `sortBy` added to the dependency array so changing sort refetches; main given `directory-page` class and `overflowX: hidden` for mobile.
- **Mobile**: Dashboard, loop profile, activity detail, marketplace, marketplace/hire, directory, how-it-works, and onboarding use responsive classes and `overflowX: hidden`; `globals.css` at 768px/640px stacks grids (profile header, profile content, activity layout), makes tabs scroll, reduces padding, and forces single-column cards on marketplace.
- **Unwired audit**: Marketplace hire form is wired to `POST /api/marketplace/hire` with 401 handling; login redirects to `/claim`. No broken links found in the audited nav/footer/dashboard.
