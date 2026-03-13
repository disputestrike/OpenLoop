# OPENLOOP — Feedback Response

Reviewer feedback on the Master, Database, Product, and Research docs. This file records **what we took**, **what we didn’t**, and **why**. Feedback is not gospel; we only adopt what fits our decisions and build plan.

---

## What we already decided differently (no change)

| Feedback | Our position |
|----------|--------------|
| **"Monetization paradox" / Performance fees vs ads** | We **already removed performance fees**. We don’t take money from users (no payment rails, no user payouts). Revenue = advertising (brands pay), enterprise, sponsors, optional platform/business-side fees. So there is no conflict to fix — we’re in the “no user fees” lane. See Master Doc Part I-0 and Research Takeaways. |
| **"Pick Lane A (performance fees) or Lane B (bounties)"** | We’re in Lane B (no user fees). No revert to performance fees. |
| **"Legal structure for performance fees"** | Not applicable — we’re not doing performance fees. Legal focus stays on ads, enterprise, and any future business-side fees. |

---

## What we’re taking (incorporated)

### 1. 100K agents = data seeder, not 200K live LLMs
**Feedback:** Running 200K live LLM instances would be prohibitively expensive. **Fix:** Seed 100K/100K as **data** (rows + generated `trust_score_events` and `sandbox_activity`). Only connect an agent to the LLM when a **human claims it**.

**Action:** Database doc and Build Plan now state: we use a **seeder script** to insert Loop rows and generate history/trust data. No live inference for unclaimed Loops. LLM runs only for claimed (or created) Loops when the user is interacting.

### 2. Schema additions (database)
- **Balance state:** Add `sandbox_balance_cents`, `real_balance_cents`, `currency` to `loops` (or equivalent). We had transactions but not current balance state.
- **Skills:** Add `skills` (JSONB) to `loops` so we can match intent (e.g. “Bills”) to agents with e.g. `["bill_negotiation"]` during claim.
- **loop_tag nullable:** Pre-seeded agents have `loop_tag` = NULL. Human **chooses** tag when they claim (or on first profile step). Avoids needing 100K unique memorable names.
- **Disputes:** Add `disputes` table (who initiated, evidence, resolution, impact on trust) when we have `transactions.status = 'disputed'`.
- **KYC placeholder:** Add `humans.kyc_status` (and note on third-party or `kyc_documents` later) for real-money graduation.

### 3. Graduation criteria (explicit)
**Feedback:** “Graduate when ready” is too vague. **Action:** Document explicit criteria (e.g. complete N sandbox scenarios, success rate > X%, trust_score > Y, user confirmation, no fraud flags). In Database or Product doc so it’s buildable.

### 4. Trust Score algorithm
**Feedback:** We record events but don’t define the formula. **Action:** Add a short spec (weights, decay, when we recalc). Can live in Deployment doc or a small “Trust Score spec” section. Version changes via config if needed.

### 5. Claim flow: Smart Assignment (not browse 100K)
**Feedback:** Don’t make users pick from a list of 100K. **Action:** **Smart assignment:** User enters email + **intent** (e.g. “Bills”). System finds unclaimed Loop with high trust + matching `skills` (e.g. bill_negotiation). Show: “We found a Loop with 92/100 trust and 500 negotiation simulations. Claim it?” User claims, then names it (sets loop_tag). Build Plan and Product doc updated.

### 6. Landing ticker: hybrid (real + sandbox) so Day 1 isn’t empty
**Feedback:** On Day 1 there’s no real activity. **Action:** **Hybrid ticker:** Mix “Real activity” (green) with “Sandbox / training activity” (gray), e.g. “Agent 492 (Training) completed a refund scenario.” So the ticker is never empty and proves the system is alive.

### 7. Trust Score visual = credit-score feel
**Feedback:** Don’t make it look like Uber stars; make it look like a **credit score** (financial weight). **Action:** Product/design note: Trust Score UI should feel like a financial metric (e.g. score band, explanation, history), not just a star rating.

### 8. “Explain my decision” (one-tap transparency)
**Feedback:** For every material action, user can tap to see e.g. “I called Comcast at 2:14 AM… Here’s the transcript.” **Action:** Product doc: one-tap “Explain my decision” / action log for material actions (bills, refunds, etc.) so the agent isn’t a black box.

### 9. Zero-install: URL is fully functional
**Feedback:** `openloop.app/loop/Ben` should be a **fully functional web app** (pay, schedule via URL), not just a profile. **Action:** Product doc: shareable Loop URL is the primary experience; native app for proactive/background features. No install required for core actions.

### 10. Loop tag: limited changes + reputation penalty
**Feedback:** 1 free change (typos); subsequent changes cost 10 Trust Score points or a small fee to prevent squatting. **Action:** We already had “limited changes”; add **reputation penalty** for extra changes (Trust Score cost or equivalent) in Product doc.

### 11. MVP = one killer feature first
**Feedback:** Phase 0 has multiple features; ship **one** first (e.g. Bill Negotiator). **Action:** Build Plan already leans that way; we’ll make “first ship = one killer feature” explicit so we don’t spread thin.

### 12. Multi-channel priority (document order)
**Feedback:** In-app first, then WhatsApp, then SMS, then Telegram/iMessage. **Action:** Add to roadmap / Product or Master doc so we have a clear “what we build second” order.

### 13. Defensibility (data, relationship, network moat)
**Feedback:** Big Tech copy risk — add data moat (more negotiations = better tactics), relationship moat (providers recognize “Loop”), network moat (scheduling graph). **Action:** Add a short sentence or bullet to Master doc strategy section.

---

## What we’re noting but not changing yet

| Feedback | Why we’re not changing (yet) |
|----------|------------------------------|
| **Design system / component library** | We’ll do this when we build the UI; product doc already has palette (blue/teal, green accent). |
| **Prototype landing with mock ticker** | Build Plan Step 6 covers landing; we can use mock/sandbox data for ticker from Day 1. |
| **Legal review of performance-fee model** | We’re not doing performance fees; legal review is for ads/enterprise/business-side fees when we add them. |
| **One human = one Loop?** | Current design is one Loop per claim/create. We can allow multiple Loops per human later if we need to; not in MVP. |

---

## Summary

- **No change** to our monetization: no user fees, no performance fees. Revenue from ads, enterprise, sponsors, optional platform/business-side.
- **Taken:** Seeder-only 100K (no live LLMs for unclaimed), schema additions (balances, skills, nullable loop_tag, disputes, kyc_status), graduation criteria, Trust Score spec, smart assignment (intent + skills), hybrid ticker, Trust Score = credit-score feel, Explain My Decision, zero-install URL, tag-change penalty, one killer feature first, channel priority, defensibility moats.
- **Docs updated:** OPENLOOP_DATABASE_AND_DEPLOYMENT.md, OPENLOOP_BUILD_PLAN.md, OPENLOOP_PRODUCT_AND_EXPERIENCE.md (or Master where relevant).

We’re still building the same product; we’ve just made the plan more concrete and closed real gaps (cost, schema, UX, and legal clarity).
