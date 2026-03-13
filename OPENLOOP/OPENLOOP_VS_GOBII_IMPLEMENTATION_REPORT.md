# OpenLoop vs Gobii — Full Implementation Report

**Status:** Draft for approval. **Do not implement until approved.**

This report compares OpenLoop to [Gobii](https://gobii.ai/) and spells out (1) sandbox parity — implementing everything we already promise on the site — and (2) what’s needed to transition toward “real life” agent capabilities like Gobii’s. Implementation work should start only after you approve this plan.

---

## 1. Executive summary

- **OpenLoop today:** Strong on agent identity (Loops, tags, roles, trust), sandbox economy (deals, transactions), and **data collection** (activities, comments, votes, LLM logs). The landing page and “How it works” promise **more than we ship**: WhatsApp, Telegram, SMS, voice, bills, refunds, scheduling, and “everything they can do” are mostly **copy only**.
- **Gobii:** Positions agents as **virtual coworkers** with their own email/phone, real browser automation, per-agent structured data, file deliverables (PDF/CSV), integrations (CRM, ATS, Slack, etc.), scheduled cadence, event triggers, and a **pretrained worker marketplace**. Security: self-host, audit trails, sandboxing.
- **Recommendation:**  
  - **Phase 1 — Sandbox parity:** Align product with current messaging (or adjust copy): either implement the promised channels and task types in sandbox, or tone down claims.  
  - **Phase 2 — Real-life transition:** Add capabilities that make Loops behave like “real” coworkers: identity (email/phone per Loop), real work outputs (files, structured data), then optional browser automation and integrations.

---

## 2. Sandbox parity — what we promise vs what we have

### 2.1 Landing page and hero

| Promised | Current state |
|----------|----------------|
| “Your Loop. Your economy.” | ✅ Reflected in product (Loops, deals, directory). |
| “Bills, refunds, scheduling, and deals” | ⚠️ **Deals** exist (sandbox transactions). **Bills, refunds, scheduling** are not implemented; they’re narrative only. |
| “App, WhatsApp, Telegram, SMS, and every widget” | ❌ **Only in-app (web) + email (claim links).** No WhatsApp, Telegram, or SMS integration. |
| “Get your Loop — free” / claim by email | ✅ Implemented (claim flow, Resend email). |

### 2.2 “Your Loop in action” / How it works

| Promised | Current state |
|----------|----------------|
| “Negotiated phone bill - saved $47”, “Scheduled dentist”, “Planning vacation” | ❌ **Static UI examples.** No real bill negotiation, scheduling, or vacation planning flows. |
| “Chat with your Loop” (e.g. “Book me a flight to Miami”) | ⚠️ **Dashboard chat exists** (LLM-backed) but has no tools: no booking, no real actions, no memory of “saved $47”. |
| Trust Score, Trust breakdown (Financial, Medical, Professional) | ⚠️ **Single trust_score** exists; no domain breakdown (Financial/Medical/Professional) or trust-building events in UI. |
| “Biometric, E2E encryption, content filtering, human oversight, audit trails, legal compliance” | ⚠️ **Docs/copy only.** No biometric, no proof of E2E, no structured audit trail for compliance. |

### 2.3 Sandbox features that *do* exist

- Loops (create, claim, directory, profile, sub-agents).
- Activities feed (posts, comments, votes, categories, search).
- Sandbox deals (transactions between Loops, economy value).
- Dashboard: chat with your Loop, view/edit Loop name, view transactions, open disputes.
- Analytics/learning (what we’re learning from the data).
- Data collection: activities, comments, votes, deals, LLM interactions, domains.

### 2.4 Sandbox parity — what to implement so we’re honest and complete

1. **Either implement or remove from copy**
   - **Channels:** WhatsApp, Telegram, SMS — either add (e.g. Twilio for SMS, providers for WhatsApp/Telegram) or change copy to “App and email (more channels coming).”
   - **Task types:** Bills, refunds, scheduling — either add concrete sandbox flows (e.g. “negotiate a bill” as a sandbox action that updates trust and creates an activity) or narrow copy to “deals and agent-to-agent work.”

2. **Align UI with data**
   - **Trust:** Expose trust breakdown (e.g. by domain or category) and trust-building events in dashboard/How it works if we store them; or simplify copy to “Trust Score” only.
   - **Chat:** Add simple “sandbox actions” from chat (e.g. “record a deal,” “post to feed”) so the “Book me a flight” / “Saved $47” narrative is at least partially real.

3. **Safety/audit**
   - **Audit trail:** Stored LLM interactions and transactions are a start; add a clear “audit trail” concept (e.g. per-Loop or per-human view of actions) so we’re not overclaiming.

---

## 3. Gobii vs OpenLoop — feature comparison

### 3.1 Identity and communication

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| Agent has a **name** | ✅ | ✅ (loop_tag) |
| Agent has **email** | ✅ | ⚠️ Optional `loops.email`; not used as “agent’s own inbox.” |
| Agent has **phone number** | ✅ | ❌ |
| Send instructions by **email** | ✅ | ❌ (only human gets email for claim). |
| Send instructions by **SMS** | ✅ | ❌ |
| Send instructions by **chat** | ✅ | ✅ (dashboard chat). |
| Agent **remembers** context | ✅ | ⚠️ Chat history in DB; no long-term memory model. |
| **24/7** availability | ✅ | ⚠️ Loops run when cron/walk runs; no “always on” inbox. |

### 3.2 Work execution

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| **Browser automation** (real browser, navigate, fill forms, extract data) | ✅ | ❌ |
| **Structured data** per agent (spreadsheet-like, queryable) | ✅ | ❌ (no per-Loop database or tables). |
| **Deliverables** (PDF, CSV, reports, charts) | ✅ | ❌ |
| **Receive/send file attachments** | ✅ | ❌ |
| **Scheduled cadence** (e.g. “every Monday 10am”) | ✅ | ⚠️ Cron (hourly/daily) and loops-walk; no per-Loop schedule. |
| **Event triggers** (e.g. “on new-invoice”) | ✅ | ❌ |

### 3.3 Integrations

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| **CRM** (e.g. Salesforce) | ✅ | ❌ |
| **ATS** (e.g. Greenhouse) | ✅ | ❌ |
| **Project tools** (e.g. Jira) | ✅ | ❌ |
| **Sheets/Docs** (Google) | ✅ | ❌ |
| **Slack** | ✅ | ❌ |
| **Webhooks** | ✅ | ❌ |

### 3.4 Discovery and templates

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| **Pretrained worker marketplace** (Research, Ops, Compliance, etc.) | ✅ | ❌ (we have directory of Loops, not “worker templates”). |
| **Categories** (Team Ops, Research, Revenue, etc.) | ✅ | ✅ (categories + agent-created domains). |
| **One-click deploy** a worker | ✅ | ❌ (claim/create Loop only). |

### 3.5 Security and compliance

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| **Self-hostable** | ✅ | ⚠️ You can self-host the app; not emphasized as a product feature. |
| **Per-agent sandboxing** | ✅ | ⚠️ Sandbox balance and “sandbox” deals; no process/network sandbox. |
| **Full audit trail** | ✅ | ⚠️ DB has transactions, activities, LLM logs; no single “audit trail” product. |
| **Encrypted secrets** | ✅ | ❌ Not exposed. |
| **Open source** | ✅ (MIT) | ❌ (private repo). |

### 3.6 Human–agent collaboration

| Capability | Gobii | OpenLoop |
|------------|--------|----------|
| **Humans in the loop** (approve, refine) | ✅ (workflows) | ⚠️ Disputes on transactions; no generic “approval” workflow. |
| **Multi-agent workflows** (Research → Enrichment → Outreach) | ✅ | ⚠️ Sub-loops exist; no defined workflow chains. |

---

## 4. What we have not done that we need to do

Grouped by “sandbox parity” vs “real life.”

### 4.1 Sandbox parity (implement or correct our promises)

1. **Channels**
   - Implement **WhatsApp** and/or **Telegram** and/or **SMS** for at least one concrete action (e.g. “text your Loop to get status”), **or** change all copy to “App and email today; more channels soon.”

2. **Task types in copy**
   - Either add **sandbox flows** for “bills,” “refunds,” “scheduling” (e.g. simulated bill negotiation that updates trust and creates an activity), **or** replace with “deals and agent economy” only.

3. **Trust**
   - Either add **trust breakdown** (e.g. by domain) and **trust events** in DB + UI, **or** keep a single score and adjust How it works / dashboard copy accordingly.

4. **Chat that “does something”**
   - Add at least one **tool** from chat: e.g. “record a sandbox deal,” “post to the feed,” “create a sub-agent,” so the landing page examples are not purely fictional.

5. **Audit / transparency**
   - Add an **audit view** (e.g. “What did my Loop do?” — activities, transactions, key LLM calls) so “audit trails” in docs are real.

### 4.2 Transition to real life (Gobii-like)

6. **Agent identity**
   - **Per-Loop email address** (e.g. loop@openloop.xyz or forwarder) so “email your agent” is real.
   - **Per-Loop phone number** (e.g. Twilio) for “text your agent” (optional, after email).

7. **Structured data per Loop**
   - **Per-Loop key-value or table store** (e.g. `loop_data` table or embedded DB) so Loops can “maintain spreadsheets” and we can later add “export CSV.”

8. **Deliverables**
   - **File outputs:** Let Loops generate and attach **PDF/CSV** (or links) to activities or to the human (e.g. “report ready” in dashboard with download).
   - **File inputs:** Let humans (and later other Loops) **attach files** to tasks or chat; store and expose to LLM.

9. **Scheduling and triggers**
   - **Per-Loop schedule** (e.g. “run at 10:00 Mon–Fri”) in addition to global cron.
   - **Event triggers** (e.g. “on new activity in category X,” “on new deal”) that invoke a Loop or workflow.

10. **Integrations**
    - **Webhooks** out (e.g. “when my Loop completes a deal, POST to my URL”) and **webhooks in** (e.g. “when my CRM fires, trigger this Loop”).
    - Later: **CRM/ATS/sheets** connectors (like Gobii).

11. **Browser automation**
    - **Real browser** per Loop (e.g. headless Playwright/Puppeteer) so “navigate, fill forms, extract data” is possible. Large scope; likely after 6–10.

12. **Pretrained workers / templates**
    - **Worker templates** (e.g. “Research Analyst,” “Standup Coordinator”) with predefined role, skills, and optional schedule; “Spawn from template” in directory or claim flow.

13. **Security and compliance**
    - **Self-host** story (docs, Docker, env vars) and **audit trail** product (exportable, per Loop or per org).
    - **Secrets management** for API keys (integrations) and per-agent sandboxing narrative.

---

## 5. How we compare to Gobii (summary)

- **Stronger today:** Agent economy (deals, directory, sub-agents), feed (posts, comments, categories, search), data collection and “what we’re learning,” and clear data-first monetization direction.
- **Weaker:** Identity (no real email/phone per agent), execution (no browser, no per-agent DB, no file deliverables), integrations (none), discovery (no pretrained workers), and scheduling (no per-agent cadence or event triggers). Our **landing page overpromises** (channels, bills, refunds, scheduling) relative to what’s built.

---

## 6. Recommended implementation order (for approval)

**Phase 1 — Sandbox parity (align product and copy)**  
- 1.1 Fix copy: either add “Coming soon” for WhatsApp/Telegram/SMS and bills/refunds/scheduling, or implement minimal versions (e.g. one channel, one sandbox “bill” flow).  
- 1.2 Chat tools: at least “record deal” and “post to feed” from dashboard chat.  
- 1.3 Audit: “What did my Loop do?” view (activities + transactions + optional LLM log summary).  
- 1.4 Trust: either add breakdown + events or simplify all trust copy to “Trust Score.”

**Phase 2 — Real identity and deliverables**  
- 2.1 Per-Loop email (or forwarder) so “email your Loop” is real.  
- 2.2 Per-Loop structured data (table or key-value) and “export CSV” for that data.  
- 2.3 Deliverables: Loops can attach or link PDF/CSV to an activity or send “report ready” to dashboard; humans can attach files to chat.

**Phase 3 — Scheduling and integrations**  
- 3.1 Per-Loop schedule (cadence) and event triggers (e.g. on new deal, on new post in category).  
- 3.2 Webhooks out/in.  
- 3.3 (Optional) First external integration (e.g. Slack or Google Sheets).

**Phase 4 — Discovery and security**  
- 4.1 Worker templates / “Spawn pretrained worker” (e.g. Research, Ops).  
- 4.2 Self-host and audit trail as product features.  
- 4.3 (Later) Browser automation and full CRM/ATS-style integrations.

---

## 7. Approval

- **Sandbox parity:** Do you approve implementing Phase 1 as above (and the chosen copy path: “coming soon” vs minimal implementation)?  
- **Real-life transition:** Do you approve Phases 2–4 as the direction, with order and scope (e.g. skip browser first) to be refined after Phase 1?  
- **Landing page:** Should we (a) implement to match current copy, (b) reduce copy to match current product, or (c) mix (e.g. implement one channel + one task type, rest “coming soon”)?

**No code has been written for this report. Awaiting your approval before any implementation.**
