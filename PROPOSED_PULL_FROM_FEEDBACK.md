# What I Will Pull From Feedback Into the Repo

**Status: APPROVED & COMPLETED**

**Your ask:** Loop in what’s needed from the feedback; show you the plan; you approve, then I implement.

---

## Already in place (no change)

| Feedback item | Current state |
|---------------|----------------|
| **loop_contracts table** | ✅ In `app/migrations/013_loop_contracts.sql` (and in run-migrate.js). We use `reward_amount_cents` and `actual_output TEXT`; feedback used `reward_amount` and `actual_output JSONB` — our schema matches the code. |
| **refundBuyer** | ✅ In `app/src/lib/payments.ts`. Refund is implemented; only optional tweak is adding Stripe `reason` (see below). |
| **.env.example** | ✅ In `app/.env.example` with DATABASE_URL, REDIS_URL, CEREBRAS_API_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY, SESSION_SECRET, NEXT_PUBLIC_APP_URL, etc. |

---

## 1. Small code tweak (from “Missing 2 pieces”)

- **refundBuyer:** Add Stripe `reason` to the refund call (e.g. `reason: 'requested_by_customer'`) so dispute refunds are clearer in Stripe.  
- **No schema change:** Keeping migration 013 as-is; no separate `db/schema.sql` unless you want a reference doc.

---

## 2. Legal (from Co-Founder Assessment + Executive Addendum)

Add **draft** legal docs (for lawyer review; not final):

| Document | Purpose |
|----------|--------|
| **TERMS_OF_SERVICE_DRAFT.md** | Key clauses: Authorization to Act (agent clause), Limitation of Liability, Indemnification. Stored in repo root; can later be turned into `/terms` page. |
| **PRIVACY_POLICY_DRAFT.md** | Key points: Data ownership, Anonymized training data license, Right to export. Repo root; can later become `/privacy` page. |

Footer already links to “Privacy” and “Terms”; those currently point to `/docs/guardrails` and `/docs/trust`. After these drafts exist we can either keep those links or add `/terms` and `/privacy` routes that render the draft content.

---

## 3. Business / operational doc (Executive Addendum)

Add one **strategic/operational** doc that fills the “missing 10%”:

| Document | Contents |
|----------|----------|
| **OPENLOOP_EXECUTIVE_ADDENDUM.md** | Financial model & unit economics (variable/fixed costs, Year 1 projection), Team structure & hiring plan, **Summary** of ToS/Privacy (with “see TERMS_OF_SERVICE_DRAFT.md / PRIVACY_POLICY_DRAFT.md”), Competitor feature matrix (OpenLoop vs OpenClaw, Lindy, Gobii, ChatGPT), Risk register (agent hallucination, regulatory, Stripe, copycats, security). |

This stays in the repo root next to the implementation plan and master doc.

---

## 4. Optional: API reference and execution map

- **API endpoint list** (short): One place that lists main endpoints (e.g. POST /api/auth/claim, GET /api/agents, POST /api/contracts, etc.) — could be a section inside `OPENLOOP_EXECUTIVE_ADDENDUM.md` or a small `API_REFERENCE.md`.  
- **Execution map:** One-page “execution map” (all steps, files, endpoints, workers) for devs/QA — could be a section at the end of `OPENLOOP_FULL_IMPLEMENTATION_PLAN.md` or a separate `EXECUTION_MAP.md`.

---

## Summary: what I will add/change after approval

1. **Code:** In `app/src/lib/payments.ts`, add `reason: 'requested_by_customer'` (or `'duplicate'` / as appropriate) to `refundBuyer`’s `stripe.refunds.create` call.  
2. **Legal drafts (repo root):**  
   - `TERMS_OF_SERVICE_DRAFT.md`  
   - `PRIVACY_POLICY_DRAFT.md`  
3. **Executive addendum (repo root):**  
   - `OPENLOOP_EXECUTIVE_ADDENDUM.md` (financials, team, competitor matrix, risk register, plus pointer to legal drafts).  
4. **Optional (your call):**  
   - Short API reference (in addendum or `API_REFERENCE.md`).  
   - One-page execution map (in implementation plan or `EXECUTION_MAP.md`).

---

## What I will not do

- **No** second schema file for `loop_contracts` — migrations remain source of truth.  
- **No** rewriting existing implementation plan or master doc — only add the addendum and legal drafts.

---

Once you approve this, I’ll apply the code change and add the three main docs (ToS draft, Privacy draft, Executive Addendum), and optionally the API reference and execution map if you want them.
