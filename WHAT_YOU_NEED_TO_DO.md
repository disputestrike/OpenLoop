# What’s Fixed (Code) vs What You Need to Do

## Fixed in code (closer to 10/10)

### 1. Escrow
- **Done:** Table `escrow_holds`, APIs: `POST /api/escrow/hold`, `POST /api/escrow/release`, `POST /api/escrow/refund`, `GET /api/escrow/[contractId]`. State layer is in place.
- **You do:** Wire Stripe (Payment Intent on hold, capture/transfer on release, refund on refund). See `app/docs/ESCROW.md`.

### 2. Scale
- **Done:** When Redis is missing, `publishEvent()` writes to `event_bus_outbox`. Table `event_bus_outbox` (migration 032). Doc `app/docs/SCALE_AND_EVENTS.md` for processing outbox or moving to Kafka later.
- **You do:** For “millions of events”, run a worker that drains the outbox to Redis or Kafka, or switch to Kafka producers when ready.

### 3. One flow engine
- **Done:** `lib/flow-engine.ts` — load memory → merge input → next step → save. `POST /api/flow/step` (body: channel, agentId, message, eventType, payload). Chat/protocol/channels can call this for one productized state machine.
- **You do:** Optionally wire chat or protocol to call `/api/flow/step` where it fits (e.g. after protocol send, or as the main “assistant” step).

### 4. Adoption / proof of network
- **Done:** Runnable demo: `npm run demo:protocol` (from `app` dir). With `DATABASE_URL` set it creates DemoBuyer/DemoSeller and API keys, then runs TASK_REQUEST → TASK_OFFER → TASK_ACCEPT → TASK_COMPLETE → PAYMENT_CONFIRM. Or pass `DEMO_API_KEY_BUYER` and `DEMO_API_KEY_SELLER` with `BASE_URL` for existing Loops.
- **You do:** Run it once to prove the handshake; then get two real teams to run agents and complete a task through the protocol (real adoption).

---

## Summary: your checklist

| Item | Status | Your action |
|------|--------|-------------|
| Escrow state + API | ✅ In code | Wire Stripe (hold/release/refund) — see ESCROW.md |
| Event bus / scale | ✅ Outbox fallback + doc | Optional: worker to drain outbox → Kafka/Redis |
| Flow engine | ✅ In code | Optional: call `/api/flow/step` from chat/protocol |
| Protocol demo | ✅ Script | Run `npm run demo:protocol`; get real teams to adopt |
| Migrations | ✅ 031, 032 added | Run `npm run db:migrate` on deploy |

Run **`npm run db:migrate`** so `escrow_holds` and `event_bus_outbox` exist, then you’re good for the new features.

---

## Flow engine — complete and all done

The flow engine is **fully implemented** (nothing cut off):

- **`src/lib/flow-engine.ts`** — `runFlowStep(loopId, agentId, channel, input)` loads persistent memory, merges input (message, eventType, payload), computes `nextStep` from memory (e.g. TASK_COMPLETE → await_payment, PAYMENT_CONFIRM → done), saves memory with `last_step`, returns `{ memory, version, nextStep, responseText }`. `getNextStep(memory)` is the single source of truth for step derivation.
- **`POST /api/flow/step`** — Auth via session, body: `{ channel?, agentId?, message?, eventType?, payload? }`. Calls `runFlowStep` and returns `{ ok, memory, version, nextStep, responseText, yourLoopId }`.

**Your side (optional):** Call this from chat or protocol when you want one canonical “step” — e.g. after a user message, or after protocol send, so every channel uses the same state machine.
