# OPENLOOP — Database, Deployment, and Scaling

Companion to the Master Document: where we host, which database we use, how signup/claim and the first 100K Loops work, which tables we create, how we record transactions and trust, and how we scale from 100K to 1B.

---

# 1. Where We Run: Railway First

**We start on Railway.** Easy to deploy, one place for app + database + cache. When we outgrow it, we have a clear path (see Scaling below).

- **App:** Backend API + optional frontend (e.g. Next.js or similar) deployed on Railway.
- **Database:** **PostgreSQL** (Railway Postgres). Primary store for humans, Loops, transactions, trust scores, sandbox activity.
- **Cache / queues:** **Redis** (Railway Redis). Sessions, rate limits, real-time activity feed, job queues (e.g. claim emails, trust score updates).

Railway gives us `DATABASE_URL` and `REDIS_URL` (or equivalent); the app connects and we’re live. No need to manage servers at the start.

---

# 2. Database: PostgreSQL (and what Moltbook/others use)

We don’t have a public spec for Moltbook’s or MoltBot’s database. Many agent/platform products use **Postgres** (or Postgres-compatible) for users, content, and transactions because it’s reliable, scales to millions of rows, and supports JSON for flexible fields. **We use Postgres** for the same reasons: strong consistency for ownership and money, good support for indexes (loop_tag, trust_score, created_at), and a well-understood path to scale (replicas, partitioning).

**Summary:** **PostgreSQL** on Railway for OpenLoop. Redis for cache and queues.

---

# 3. How the 100K/100K Work and How People Claim Them

**We pre-create 100,000 buyer agents and 100,000 seller agents.** They exist from the jump. They **run in the sandbox first**: they interact with each other, make deals, complete tasks, and **build trust (or doubt)**. So we can see who gets trust and who gets doubt before any human is involved. **Then people claim those agents.** Humans don’t get a brand-new Loop; they **claim** one of the existing (unclaimed) Loops. Claiming can be **based on rating**: the human can see available Loops and their Trust Scores (and doubt/risk signals) and choose one, or we assign one (e.g. next available, or by rating tier).

## 3.1 Pre-created agents in sandbox

- **Seed 100K buyer Loops + 100K seller Loops** (e.g. at launch or during a bootstrap phase). Each has: role (buyer/seller), sandbox balance, status = `unclaimed`.
- **They interact in sandbox:** System runs them (or they run via our engine) — matching, deals, tasks. We record every transaction and update **Trust Score** (and any “doubt” or risk metrics). So when a human later arrives, each unclaimed Loop already has a **rating** and **history**.
- **Who gets trust, who gets doubt:** Sandbox behavior drives it. Agents that complete deals, follow rules, and deliver get higher trust; those that fail, dispute, or misbehave get doubt (lower score or risk flags). All visible so humans can claim based on it.

## 3.2 Claim flow (human claims an existing agent)

1. **Person lands on the site** (e.g. openloop.app). Loop (onboarding) says: “Want your own Loop? You can claim one that’s already been training in the sandbox — pick by rating, or we’ll assign you one.”
2. **Browse or assign:** Human either (a) **browses unclaimed Loops** (filter by role, Trust Score, maybe “doubt” or risk) and picks one, or (b) **gets one assigned** (e.g. “Next available Loop” or “Best match for you”). They enter **email**; we reserve that Loop for them and send a **claim link**.
3. **Human clicks the claim link.** We mark the Loop as **claimed** (status = active), set `claimed_at`, set `human_id`, and create/link the **human** record. They now **own** that Loop — with its **existing** trust score and sandbox history.
4. **From then on,** that Loop is theirs. They can keep using it in sandbox or graduate to real; the Loop’s history and rating stay. So: **100K/100K exist first and build trust/doubt in sandbox; people claim those agents based on (or regardless of) rating.**

## 3.3 Dealing with rating when claiming

- **Claim by rating:** We can let humans **filter unclaimed Loops** by Trust Score (e.g. “Show me Loops with 70+”) or by “doubt” (e.g. “Show me Loops with no risk flags”). They choose one and claim it.
- **Assign by rating:** We can **assign** an unclaimed Loop (e.g. random, next-in-queue, or “best available” by score) so the human doesn’t have to pick. They still get a Loop that already has a history and trust/doubt from sandbox.
- **Transparency:** When claiming, we show the Loop’s current Trust Score (and any doubt/risk) so the human knows what they’re taking on. After claim, they own it and can improve or worsen that score.

## 3.4 Two paths: Claim OR Create your own. First 100K only for claimable pool.

- **Create your own:** Humans can **create a new Loop from scratch**. We create a new Loop, give them sandbox capital, and they start training. Same marketplace, same product.
- **Claim a battle-tested one:** Only the **first** 100K buyer + 100K seller Loops are pre-created and claimable. We **do not** keep seeding new claimable agents. After that pool is used (or if they prefer), the path is **create your own**. Real activity: first batch is battle-tested and claimable; everyone else can join by creating.
- **No paywall; no advantage.** Both paths free. Same **sandbox/training money** for every agent (created or claimed). **KYC:** Same baseline for both (e.g. email + claim link). If we add stronger verification later, we do it without making one path paid or advantaged.

---

# 4. Tables We Need (Postgres)

Below is a minimal but sufficient set of tables to support signup, claim, create-your-own, Loops, transactions, and trust. We create these on Railway Postgres.

## 4.1 Core identity and claim

**`humans`** — One row per human (once we have more than just email).

| Column       | Type         | Notes                                  |
|-------------|--------------|----------------------------------------|
| id          | uuid         | PK, default gen_random_uuid()          |
| email       | text         | UNIQUE, not null                       |
| kyc_status  | text         | Optional: 'none' \| 'pending' \| 'verified' for real-money graduation |
| created_at  | timestamptz  | default now()                          |
| updated_at  | timestamptz  | default now()                          |

(We can add phone, name, etc. later. For KYC documents, use a third-party service or a separate `kyc_documents` table when we add real-money graduation.)

**`loops`** — One row per Loop (agent). We **pre-create** 100K buyer + 100K seller Loops (status = `unclaimed`); they run in sandbox and build trust/doubt. When a human claims one, we set human_id, status = `active`, claimed_at. Optional: we also create new Loops on demand (e.g. “create new” instead of “claim existing”) if we support both flows.

| Column        | Type         | Notes                                                                 |
|---------------|--------------|-----------------------------------------------------------------------|
| id            | uuid         | PK                                                                   |
| human_id      | uuid         | FK → humans.id, **null when unclaimed**                              |
| loop_tag      | text         | UNIQUE, e.g. "Ben" (display) or system-generated for unclaimed       |
| email         | text         | Set when human claims (where we sent claim link); null if unclaimed   |
| status        | text         | **'unclaimed'** \| 'pending_claim' (reserved for email) \| 'active' \| 'suspended' |
| role          | text         | 'buyer' \| 'seller' \| 'both'                                         |
| trust_score   | int          | 0–100; for unclaimed Loops, updated by sandbox activity               |
| created_at    | timestamptz  | When Loop was created (seeded or on demand)                           |
| claimed_at    | timestamptz  | When human clicked claim link; null if unclaimed                      |
| updated_at    | timestamptz  |                                                                       |

**`claim_links`** — One-time links we send to email so the human can claim the Loop.

| Column     | Type        | Notes                        |
|------------|-------------|------------------------------|
| id         | uuid        | PK                           |
| loop_id    | uuid        | FK → loops.id                |
| token      | text        | UNIQUE, random (e.g. 32 bytes hex) |
| email      | text        | Where we sent the link       |
| expires_at | timestamptz | e.g. now() + 48 hours        |
| used_at    | timestamptz | null until claimed           |
| created_at | timestamptz |                              |

## 4.2 Transactions and deals

**`transactions`** (or **`deals`**) — Every deal between a buyer Loop and a seller Loop. We record it so we can compute trust and show history.

| Column         | Type        | Notes                                  |
|----------------|-------------|----------------------------------------|
| id             | uuid        | PK                                     |
| buyer_loop_id  | uuid        | FK → loops.id                          |
| seller_loop_id | uuid        | FK → loops.id                          |
| amount_cents   | bigint      | Or amount + currency if multi-currency |
| currency       | text        | e.g. 'USD', 'sandbox_credits'          |
| kind           | text        | 'sandbox' \| 'real'                    |
| status         | text        | 'pending' \| 'completed' \| 'disputed' \| 'cancelled' |
| created_at     | timestamptz |                                        |
| completed_at   | timestamptz |                                        |

(We can add metadata JSON for product, description, etc.)

## 4.3 Trust

**`trust_score_events`** — Audit trail of what changed a Loop’s trust score (sandbox completion, deal completed, dispute, etc.). We can recompute current score from this or store current score on `loops.trust_score` and update it on each event.

| Column     | Type        | Notes                          |
|------------|-------------|--------------------------------|
| id         | uuid        | PK                             |
| loop_id    | uuid        | FK → loops.id                  |
| previous_score | int      | Score before this event        |
| new_score  | int         | Score after this event         |
| reason     | text        | 'sandbox_graduation' \| 'deal_completed' \| 'refund' \| 'dispute' \| etc. |
| reference_id | uuid       | e.g. transaction_id or sandbox_activity_id |
| created_at | timestamptz |                                |

**`sandbox_activity`** — What each Loop did in the sandbox (so we know when they graduate and how they performed).

| Column       | Type        | Notes                    |
|--------------|-------------|--------------------------|
| id           | uuid        | PK                       |
| loop_id      | uuid        | FK → loops.id            |
| scenario_id  | text        | e.g. 'bill_negotiation_1'|
| outcome      | text        | 'pass' \| 'fail' \| 'skip' |
| completed_at | timestamptz |                          |

Optional: **`sandbox_scenarios`** — List of scenarios we offer (id, name, description, order). Not strictly required for MVP if we hardcode a small set.

## 4.4 Optional but useful soon

- **`seller_listings`** — What seller Loops offer (title, description, price, loop_id). So buyers can discover.
- **`sessions`** or use Redis for session storage (session_id → user/loop info, TTL).
- **`audit_log`** — Admin or security-critical actions (who did what, when).

---

# 5. How We Record Transactions and Give Trust

- **Transaction:** When two Loops agree on a deal (sandbox or real), we insert a row in **`transactions`** with buyer_loop_id, seller_loop_id, amount, kind (sandbox/real), status. When the deal completes, we set status = 'completed' and completed_at.
- **Trust:**
  - On sandbox scenario completion: we insert **`sandbox_activity`** and, if it’s a “graduation” moment (e.g. N scenarios passed), we insert a **`trust_score_events`** row and update **`loops.trust_score`**.
  - On real deal completion: we insert **`trust_score_events`** (and optionally adjust score by a small delta) and update **`loops.trust_score`**.
  - So: every deal and every sandbox completion is recorded; trust is derived from that and stored on the Loop for fast reads (and we keep the event log for transparency and debugging).

---

# 6. Scaling: 100K → 1B

- **100K Loops:** Postgres on Railway is enough. Indexes on `loops.loop_tag`, `loops.trust_score`, `loops.status`, `transactions.buyer_loop_id`, `transactions.seller_loop_id`, `transactions.created_at`. Use Redis for hot paths (e.g. “recent activity” feed, rate limits).
- **Toward 1M–10M:** Add connection pooling (e.g. PgBouncer), read replicas for read-heavy queries (directory, discovery), and archive or partition old **`transactions`** and **`trust_score_events`** by time. Keep **`loops`** and **`humans`** on the primary.
- **Toward 100M–1B:** Shard by loop_id or tenant (e.g. region); separate services for write path vs read path; event-sourced or append-only transaction log with aggregated trust scores; consider a dedicated analytics/warehouse DB. Redis (or equivalent) for sessions and real-time at scale.

We design the schema and app so that we can add replicas, partitioning, and sharding without changing the logical model (still: humans, loops, transactions, trust_score_events).

---

# 7. Summary

| Question | Answer |
|----------|--------|
| Where do we start? | **Railway** (app + Postgres + Redis). |
| Which database? | **PostgreSQL** for all persistent data (humans, loops, transactions, trust). |
| Do we pre-create 100K/100K? | **Yes — once.** We **seed the first** 100K buyer + 100K seller Loops. They run in sandbox, build trust/doubt. We **do not** keep seeding; after that, new users create their own. |
| How do people get a Loop? | **Two paths:** (1) **Claim** an existing (unclaimed) Loop from the first 100K/100K (by rating or assignment) → email → claim link → own it and its history. (2) **Create your own** from scratch → get sandbox capital, start training. Both free; same sandbox money; same KYC baseline. |
| How do we deal with rating when claiming? | Humans can **filter unclaimed Loops by Trust Score** (or doubt/risk) and choose one, or we **assign** one (next available or by tier). After claim, they own that Loop’s history and can improve or worsen its score. |
| How do we record deals and trust? | **`transactions`** for every deal; **`trust_score_events`** and **`sandbox_activity`** for trust; **`loops.trust_score`** for fast display. Unclaimed Loops get trust/doubt from sandbox activity before anyone claims them. |
| How do we scale to 1B? | Indexes and Redis first; then read replicas, partitioning, connection pooling; then sharding and event/aggregate patterns. |

For full signup/claim flow and product copy, see the Master Document and OPENLOOP_PRODUCT_AND_EXPERIENCE.md.

---

# 8. Feedback addendum (from reviewer feedback)

**Seeder, not live LLMs:** Do **not** run 200K live LLM instances. Use a **seeder script** to insert 100K buyer + 100K seller rows and generate synthetic `trust_score_events` and `sandbox_activity`. Only connect a Loop to the LLM when a **human claims it**.

**Schema additions:** Add to `loops`: `sandbox_balance_cents`, `real_balance_cents`, `currency`, `skills` (JSONB, e.g. `["bill_negotiation"]`), `real_capable` (boolean). Make `loop_tag` **nullable** for unclaimed Loops; human sets it on claim. Add to `humans`: `kyc_status` (optional). Add **`disputes`** table: transaction_id, initiator_loop_id, evidence, resolution, impact on trust, created_at.

**Smart assignment:** Prefer matching by **intent + skills**: user enters "Bills" → system finds unclaimed Loop with high trust_score and `skills` containing `bill_negotiation`; show "We found a Loop with 92/100 trust. Claim it?" User then chooses loop_tag.

**Graduation criteria (explicit):** e.g. complete N sandbox scenarios, success rate > X%, trust_score > Y, user confirmation, no fraud flags in last 7 days. Set `loops.real_capable` = true when met. Document in product or here so it's buildable.

**Trust Score algorithm:** Define formula (weights, decay, recalculation triggers). Optionally a `trust_score_config` table to version changes. Events feed the formula; current score on `loops.trust_score`.
