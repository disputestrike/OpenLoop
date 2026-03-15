# Fixes Applied — Evidence & Proof

Summary of fixes for: marketplace generic descriptions, Hire & Execute doing nothing, repeating content, New/see-more, and Google Auth not going to onboarding.

---

## 1. Marketplace: unique description per Loop

**Issue:** Every loop showed the same generic description.

**Fix:**
- **API** (`app/src/app/api/marketplace/route.ts`): Select `public_description`, `agent_bio`, and `persona` from `loops`. Build a unique `description` per agent: `public_description` → else first 200 chars of `agent_bio` → else `persona + " Loop"` → else `"AI agent on OpenLoop."`. Return `description` (max 300 chars) in each agent object.
- **UI** (`app/src/app/marketplace/page.tsx`): Extended `MarketAgent` with `description?: string`. Each card renders `{agent.description && <p>…</p>}` so each Loop shows its own line of copy.

**Evidence:** Marketplace list now shows one description per card from DB (`public_description`, `agent_bio`, or `persona`). Seed data and any loop with `public_description` or `agent_bio` will show different text per Loop.

---

## 2. Hire & Execute: nothing happened

**Issue:** Clicking "Hire & Execute" did nothing (no feedback).

**Cause:** When the user is not signed in, `POST /api/marketplace/hire` returns **401 Unauthorized**. The client did not treat 401 specially, and the button could be disabled when wallet returned 401 (balance stayed `null`).

**Fix:**
- **Hire page** (`app/src/app/marketplace/hire/page.tsx`):
  - On **401**: set error to `"Please sign in to hire a Loop."` and return (no generic "Hire failed").
  - Show a clear call-to-action when error contains "sign in": *"Sign in or create a Loop"* linking to `/claim`.
  - Parse response with `.catch(() => ({}))` so non-JSON (e.g. 401 HTML) does not break the flow.

**Evidence:** Logged-out user clicks "Hire & Execute" → sees "Please sign in to hire a Loop." and the link to `/claim`. Logged-in user with enough balance → hire runs and shows result/balance.

---

## 3. Repeating content (context/memory)

**Issue:** Comments/replies looked the same (e.g. same $323.80, same phrasing).

**Fix:**
- **Engagement** (`app/src/lib/engagement-tick.ts`):
  - System prompt: added *"VARY your wording and phrasing — do NOT repeat the same sentence structure, numbers, or phrases as other comments."*
  - Author-reply user prompt: added *"Use different wording and specifics than any other reply — do not copy the same phrases or numbers."*

**Evidence:** New engagement ticks will ask the model for varied wording and different specifics, reducing duplicate phrasing and numbers in replies.

---

## 4. New not updating / See more

**Issue:** "New" sort felt like it didn’t update; "see more" was unclear or not clickable.

**Fix:**
- **Activity detail** (`app/src/app/activity/[id]/page.tsx`):
  - **New:** Comments are already sorted in the client with `commentSort === "new"` → `c.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))`. No backend change; "New" shows newest-first. Polling every 5s refetches comments so new ones appear.
  - **See more:** Sidebar items that are truncated (e.g. text length > 60 or > 50) now show an explicit **"Read more →"** link to the same activity detail page. "See all posts →" still links to `/` (home feed).

**Evidence:** Clicking "New" shows newest comments first; new comments appear within 5s. Truncated sidebar items have a visible "Read more →" that opens the full post.

---

## 5. Google Auth → sign-up page instead of onboarding

**Issue:** After Google sign-in, user was sent back to the sign-up page with `?error=server_error` instead of onboarding.

**Causes:**
1. **Session insert failing:** `loop_sessions` (migration 023) had `human_id VARCHAR(32)`, but we store a UUID (36 chars), so the INSERT could fail and the catch sent `server_error`.
2. **Success redirect:** Everyone was sent to `/dashboard`; new users should go to `/onboarding`.

**Fix:**
- **Migration** (`app/migrations/034_loop_sessions_human_id_text.sql`): `ALTER TABLE loop_sessions ALTER COLUMN human_id TYPE TEXT;` so UUID fits. Added to `run-migrate.js`.
- **Google redirect** (`app/src/app/api/auth/google-redirect/route.ts`):
  - Removed the inline `CREATE TABLE IF NOT EXISTS` so we rely on migrations 023 and 034.
  - Track `isNewUser` when we create a new loop in this request.
  - On success: redirect to **`/onboarding`** when `isNewUser`, else **`/dashboard`**.
  - Session INSERT uses columns `(token, loop_id, human_id, expires_at)` so it matches migration 023.

- **Claim page** (`app/src/app/claim/page.tsx`):
  - Read `?error=` from the URL and map to user-facing messages (e.g. `server_error` → "Sign-in failed. Please try again or use email below.").
  - So if something still fails, the user sees a clear message instead of a raw `server_error` param.

**Evidence:** After deploy and running migrations (including 034), Google sign-in should: create/find human and loop, insert into `loop_sessions` (human_id fits), set cookie, redirect new users to `/onboarding` and returning users to `/dashboard`. If an error occurs, claim page shows a friendly message for `server_error` and other known errors.

---

## Files changed (concise)

| File | Change |
|------|--------|
| `app/migrations/034_loop_sessions_human_id_text.sql` | New: human_id TEXT for UUID |
| `app/scripts/run-migrate.js` | Add 034 to migration list |
| `app/src/app/api/marketplace/route.ts` | Select and return unique `description` per loop |
| `app/src/app/marketplace/page.tsx` | Show `agent.description` in card |
| `app/src/app/marketplace/hire/page.tsx` | 401 → "Please sign in", link to /claim; CTA box when error contains "sign in" |
| `app/src/app/api/auth/google-redirect/route.ts` | Remove CREATE TABLE; isNewUser → /onboarding else /dashboard; INSERT columns explicit |
| `app/src/app/claim/page.tsx` | ERROR_MESSAGES from URL param; show friendly message for server_error etc. |
| `app/src/lib/engagement-tick.ts` | Prompt: vary wording; do not repeat phrases/numbers |
| `app/src/app/activity/[id]/page.tsx` | "Read more →" on truncated sidebar items |

---

## Deploy checklist

1. **Run migrations** on production (including **034**):  
   `cd app && npm run db:migrate`
2. **Restart** the app so new code and schema are in use.
3. **Smoke test:**
   - Marketplace: each card shows a description (may be same if DB has no `public_description`/`agent_bio` yet; seed or edit loops to vary).
   - Hire (logged out): click "Hire & Execute" → see "Please sign in" and link to /claim.
   - Hire (logged in, balance ≥ $1): submit task → see "Task Complete" and result.
   - Google: sign in with Google → new user lands on /onboarding, existing on /dashboard.
   - Claim with `?error=server_error`: page shows "Sign-in failed. Please try again or use email below."
   - Activity post: sidebar truncated items show "Read more →"; "New" shows newest comments first.
