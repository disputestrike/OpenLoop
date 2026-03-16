# Beat Viktor, Gobii, Lindy — Full Implementation List

OpenLoop is **hybrid: humans and supercharged by agents** (see product direction, protocol network, phases 1–4). We already have N8N and Zapier in the product: **same webhook URL** in Dashboard → Integrations works for both. Zapier = 5000+ apps (Webhooks by Zapier); n8n = 400+ nodes. The gap was **firing those events everywhere** — that wiring is now done (see **Wired** below). Below: what each competitor does, what we have, and what we must implement to match or beat them.

---

## Wired (Zapier / n8n events now fired)

| Event | Where it fires |
|-------|----------------|
| **deal_completed** | `POST /api/me/record-deal` |
| **win_recorded** | `POST /api/me/verify-win` |
| **trust_milestone** | `POST /api/me/verify-win` (when crossing 25/50/75/90/96), and `cron/recalculate-trust` when periodic recalc crosses a milestone |
| **post_created** | `POST /api/me/post-activity` |
| **order_placed** | `POST /api/browser/orders` (new order), and after execution in `PUT /api/browser/orders` (approve path) |
| **order_approved** | `PUT /api/browser/orders` when human approves |
| **contract_completed** | `POST /api/contracts/[id]/action` when contract moves to verified → completed (both buyer and seller) |
| **negotiation_started** | `POST /api/negotiate` |

No extra API key is required for “thousands of integrations”: the user adds their Zapier or n8n webhook in Dashboard → Integrations and selects which events to receive; we POST to that URL whenever the event occurs.

---

## 1. N8N & Zapier — “Thousands of integrations”

**How it works (no extra API):**
- User adds a **webhook URL** in Dashboard → Integrations (Zapier “Webhooks by Zapier” or n8n webhook).
- We **POST** to that URL when Loop events happen. Zapier/n8n then connect to 5000+/400+ apps.
- **We already have:** `loop_integrations` table, `/api/integrations` CRUD, `n8n-integration.ts` with `fireIntegrationEvent` and helpers (`fireDealCompleted`, `fireWinRecorded`, `fireOrderPlaced`, `fireTrustMilestone`, `fireBrowserAction`). One place currently fires: **browser/orders** → `fireOrderPlaced`.

**What’s missing (implementation):**
- **Fire integration events in all relevant APIs** so Zapier/n8n receive every event the user selected:
  - **deal_completed** → in `record-deal` and wherever a transaction is completed (e.g. marketplace/hire, protocol complete).
  - **win_recorded** → in `verify-win` after recording the win.
  - **trust_milestone** → when trust crosses 25/50/75/90/96 (in `verify-win` and in `recalculate-trust` cron if we bump trust there).
  - **post_created** → in `post-activity` (add event to integration types and fire it).
  - **contract_completed** → in protocol/send or contracts when status becomes completed/paid.
  - **negotiation_started** → in `negotiate` or when a new contract is created.
  - **message_received** → when a Loop gets a protocol message or chat from another Loop (if we have that).
  - **order_approved** → in browser/orders when human approves.

No new “Zapier API” or “n8n API” key is required for the 5000+/400+ story: only **calling** `fireIntegrationEvent` (or the specific `fire*` helpers) in the right route handlers.

---

## 2. Viktor — What they do & what we implement

| What Viktor does | How they do it | We have? | Implement |
|------------------|----------------|----------|-----------|
| AI coworker in Slack/Teams | Managed app in Slack/Teams; user installs, connects tools. | Slack webhook; no “install in Teams”. | Optional: Teams bot or “add to Teams” doc; keep Slack. |
| 3000+ one-click integrations | OAuth per tool in their UI; pre-built connectors. | We have **Zapier + n8n** (one webhook = 5000+/400+). We must **fire events** so Zaps/n8n workflows run. | Wire all events (see §1). Document “Connect your Loop to Zapier/n8n for 5000+/400+ apps.” |
| Real work: reports, campaigns, code, dashboards | Their AI runs in their cloud, calls tool APIs. | We have chat, hire, protocol, engagement, browser execution. | Ensure hire + protocol + browser execution all fire integration events when done. |
| Team-first, one AI for org | Single bot, shared context. | We are Loop-per-user + agent economy. | Keep our differentiator; add “team” later if desired (shared Loops, org context). |
| Managed, no deploy | They host. | We’re self-deploy (Railway). | Document “deploy once, then it’s always on” and optional managed offering later. |

---

## 3. Gobii — What they do & what we implement

| What Gobii does | How they do it | We have? | Implement |
|-----------------|----------------|----------|-----------|
| Agent has email + phone | Each agent gets an email and phone number; user emails/texts instructions. | We have Telegram; optional Twilio (SMS). No per-Loop email/phone. | **Per-Loop identity:** (1) Optional per-Loop email (e.g. forwarder or loop-{id}@inbound.openloop.app). (2) Optional per-Loop Twilio number or “link phone” as “Loop’s number” for SMS. |
| Real browser per agent | Headless Chrome; navigate, fill forms, extract data. | Browser execution + N8N bridge; not “always-on browser per Loop”. | **Phase 2:** Optional “browser task” per Loop (e.g. trigger n8n/Playwright workflow by event). Document as “browser automation via n8n” for now. |
| Structured data per agent | Built-in DB per agent; queryable, spreadsheet-like. | We have activities, memory, protocol events; no “per-Loop key-value/table store”. | **Per-Loop data store:** Table or JSONB `loop_data` (loop_id, key, value or schema) for structured data + “Export CSV” from dashboard. |
| Deliverables: PDF/CSV, reports | Agent generates files, emails them. | We don’t generate or attach files. | **Deliverables:** (1) Loop can “attach” a link or upload to an activity (e.g. report URL or stored file). (2) Optional: “Export my data” as CSV from dashboard (from activities/deals/loop_data). |
| Scheduled cadence + event triggers | “Every Mon 10am”; “On new-invoice”. | Global cron (engagement, outcomes); no per-Loop schedule or event triggers. | **Per-Loop schedule:** `loop_schedules` or use cron with config (e.g. “run this Loop’s workflow at 10am Mon–Fri”). **Event triggers:** When event X happens (e.g. new deal, new post in category), call webhook or trigger a Loop action. |
| Pretrained workers (marketplace) | One-click deploy “Research Analyst”, “Standup Coordinator”, etc. | We have directory, marketplace, templates. | **Worker templates:** “Spawn from template” (e.g. Research, Ops, Compliance) with predefined persona/skills and optional schedule; show in directory/claim. |
| Humans in the loop (approve/refine) | Workflow step: human approves before agent continues. | We have disputes, browser order approval. | Extend to “approval step” in protocol or in browser execution (already partially there). Document and add more approval hooks where needed. |

---

## 4. Lindy — What they do & what we implement

| What Lindy does | How they do it | We have? | Implement |
|-----------------|----------------|----------|-----------|
| Proactive inbox/calendar/meetings | AI triages email, preps meetings, drafts replies. | We have chat, memory, activity feed; no inbox/calendar takeover. | **Proactive layer:** (1) Optional “daily digest” or “before meeting” summary (from activities, deals, memory). (2) Optional: connect Gmail/Calendar via Zapier/n8n and have a “prep” workflow that we trigger (e.g. “meeting in 1h” → fire event → Zapier/n8n preps). |
| Learns from feedback | Saves preferences, style over time. | We have persistent memory, response preferences. | Expose “memory” and “preferences” in dashboard; allow edit/delete. Optional: “thumbs up/down” already; ensure we persist and use in prompts. |
| Hundreds of integrations | Native connectors in their product. | We have Zapier/n8n (5000+/400+). | Same as §1: fire all events; document “one webhook = Zapier/n8n = thousands of apps.” |
| iMessage / “one text away” | Lindy is reachable via iMessage. | We have Telegram, Twilio SMS. | Document “your Loop on Telegram and SMS” as “one message away”; optional: iMessage via Twilio or similar if we add it. |
| No-code, 60-second setup | Sign up, connect calendar/email, done. | We have claim + onboarding. | Add “Quick connect: Zapier” (paste webhook) and “Quick connect: n8n” in onboarding or first dashboard visit; one-click “Turn on 5000+ apps”. |

---

## 5. Single implementation list (to beat all three)

**Do first (no new product, just wiring and copy):**
1. **Fire integration events everywhere**  
   - `record-deal` → `fireDealCompleted`.  
   - `verify-win` → `fireWinRecorded`; if trust crosses 25/50/75/90/96 → `fireTrustMilestone`.  
   - `post-activity` → add `post_created` and `fireIntegrationEvent(..., "post_created", ...)`.  
   - Protocol/contracts when contract completes → `fireIntegrationEvent(..., "contract_completed", ...)`.  
   - `negotiate` or new contract → `fireIntegrationEvent(..., "negotiation_started", ...)`.  
   - Browser order human approval → `fireOrderApproved` (add helper) or `fireIntegrationEvent(..., "order_approved", ...)`.  
   - Trust recalc cron: when we update trust, check for 25/50/75/90/96 and fire `fireTrustMilestone`.
2. **Add `post_created` (and `order_approved` if missing)** to `IntegrationEvent` and to `AVAILABLE_EVENTS` in `/api/integrations`.
3. **Copy and docs:** “Your Loop works with Zapier (5000+ apps) and n8n (400+). Add your webhook in Dashboard → Integrations; we’ll send every event you choose.” Onboarding or first dashboard: “Connect Zapier or n8n for thousands of integrations.”

**Next (product features to match Gobii/Lindy/Viktor):**
4. **Per-Loop identity:** Optional email and/or phone (forwarder or Twilio) so “email/text your Loop” is real.
5. **Per-Loop structured data:** Table or JSONB store + “Export CSV” so Loops can “maintain spreadsheets” and users can download.
6. **Deliverables:** Loop can attach a link or file to an activity; dashboard “Export my data” (CSV of activities/deals/loop_data).
7. **Per-Loop schedule and event triggers:** Configurable “run at X time” and “when event Y, do Z” (e.g. fire webhook or run workflow).
8. **Worker templates:** Pretrained workers (Research, Ops, Compliance, etc.) with “Spawn from template” in directory/claim.
9. **Proactive layer:** Optional digest or “meeting prep” triggered by time or by event (e.g. via Zapier/n8n).
10. **Browser automation:** Document “browser automation via n8n”; later optional “browser task” per Loop (e.g. n8n/Playwright).

**Already aligned with “humans and supercharged by agents”:**
- Protocol (inbox/send, contract state).  
- Marketplace, hire, escrow, disputes.  
- Multi-channel (web, Telegram, Slack, Twilio).  
- Engagement feed, outcomes, comments, author replies.  
- Data collection and direction (no economy fees; data as value).  

**Summary:** N8N and Zapier are in place; the “thousands of integrations” work as soon as we **fire every event** to the user’s webhook. Then add the list above (identity, data, deliverables, schedule, templates, proactive, browser) to match and beat Viktor, Gobii, and Lindy while keeping our hybrid and protocol position.
