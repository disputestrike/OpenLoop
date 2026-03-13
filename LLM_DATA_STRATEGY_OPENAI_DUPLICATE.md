# LLM data: level, quality, structures — and how we duplicate OpenAI’s strategy

Answering: **Is this the level/quality/field of data needed to create an LLM? What’s missing? How do we duplicate OpenAI’s strategy?**

---

## 1. Is our current data enough to create an LLM?

**Short answer: No. We have a useful base (in-app prompts/responses and engagement) but we’re missing the two pillars OpenAI uses: (1) huge, varied pre-training-style data, and (2) structured human feedback for alignment (RLHF/preferences).**

Rough bar:

- **Pre-training:** Billions of tokens of diverse text (web, books, code, etc.), cleaned and deduped.
- **Alignment:** Large-scale preference/ranking data (chosen vs rejected outputs, or A > B > C) and/or human corrections.

We have:

- **Good:** Prompt/response logs (`llm_interactions`), activities/comments (domain-tagged), votes on activities, deals. Enough to improve product and to start building “Loop-style” and outcome-focused datasets.
- **Missing:** Scale and variety of pre-training data, and **structures** for preferences/corrections (see below). So we’re not yet at “create an LLM” level; we’re at “create a strong data pipeline that can feed an LLM later.”

---

## 2. What’s missing (checklist)

### A. Pre-training / diverse corpus

| Item | Status | Notes |
|------|--------|------|
| Large-scale raw text | ❌ Missing | No ingestion of web, books, code, papers. Only in-app generated text. |
| Domain/language/source tags | ⚠️ Partial | We have `domain` on activities; no language, no “source” (in-app vs ingested). |
| Deduplication pipeline | ❌ Missing | No dedup step before training. |
| Safety/PII filtering | ❌ Missing | No systematic filter before export for training. |
| License/rights per document | ❌ Missing | No table or field for “license” or “can_train”. |

### B. Alignment / human feedback (OpenAI-style RLHF)

| Item | Status | Notes |
|------|--------|------|
| Preference pairs (chosen vs rejected) | ❌ Missing | Need (prompt_id, chosen_response_id, rejected_response_id) or equivalent. We have votes on **activities**, not on **individual LLM replies** for the same prompt. |
| Rankings (A > B > C) | ❌ Missing | No schema for “response A better than B better than C” for one prompt. |
| Human corrections / edits | ❌ Missing | No (original_response, corrected_response) or edit history. |
| Per-response ratings | ⚠️ Partial | Votes are on activities (posts), not on each chat reply or each generated comment. |
| Reward-model-ready export | ❌ Missing | No export format (e.g. prompt, chosen, rejected) for training a reward model. |

### C. Structures (tables/schemas)

| What we have | What’s missing |
|--------------|----------------|
| `llm_interactions` (prompt, response, kind, loop_id) | No link to **human feedback** (which response was preferred, or corrected). No `language`, no `source` (in-app vs ingested). |
| `activity_votes` (activity_id, loop_id, vote) | No **response-level** preference (e.g. two replies to same prompt: which is better?). No table for (prompt_id, chosen_id, rejected_id). |
| `activities` (title, body, domain) | No **ingested_corpus** (or similar) for external text with license/language/source. |

So: **level** and **quality** are not yet at “create an LLM” level; **field** (what we collect) is partly right (prompts, responses, domains, votes) but **structures** for alignment and for a large pre-training corpus are missing.

---

## 3. How we duplicate OpenAI’s strategy (concrete)

OpenAI-style strategy in three layers:

1. **Pre-training data:** Massive, varied, clean text.
2. **Alignment data:** Preferences (chosen vs rejected) and/or corrections.
3. **Infra:** Storage, metadata, dedup, filtering, export for training.

Below: what to add so we can **duplicate** that strategy.

---

### 3.1 Pre-training / corpus (scale + variety)

**Goal:** Feed a model with billions of tokens of diverse, licensed text.

**Structures to add:**

- **`ingested_corpus`** (or equivalent):  
  - `id`, `content` (text), `source` (e.g. web | book | code | partner), `license` (e.g. license_id or “public_domain”), `language`, `domain`, `token_count_approx`, `created_at`, `can_use_for_training` (boolean).  
  - Optional: `url`, `metadata` (JSONB) for provenance.

- **`corpus_sources`** (optional):  
  - `id`, `name`, `license`, `ingestion_date`, so we know what we’re allowed to use.

**Process:**

1. Ingest from partners, licensed datasets, public-domain books/code; crawl only where we have rights.
2. Normalize into `ingested_corpus` with language, domain, license.
3. Run dedup (e.g. hash or embedding) and safety/PII filtering; set `can_use_for_training`.
4. Export for pre-training (e.g. by language/domain, with license tags).

**In-app text:** Treat `activities.body`, `activity_comments.body`, and `llm_interactions.response` (and prompt if desired) as another **source** of training text; add `source = 'openloop_app'` and same metadata (language, domain) so we have one unified “corpus” view later.

---

### 3.2 Alignment / human feedback (RLHF-style)

**Goal:** Same type of signal OpenAI uses: “which output is better?” and “corrected version.”

**Structures to add:**

- **`response_preferences`** (preference pairs):  
  - `id`, `prompt_id` (FK to `llm_interactions.id` or a “prompt” table), `chosen_response_id`, `rejected_response_id`, `human_id` or `loop_id` (who gave the preference), `created_at`.  
  - So: for one prompt we store “human (or trusted process) chose A over B.”

- **`response_rankings`** (optional, for A > B > C):  
  - `id`, `prompt_id`, `ranking` (array of response_ids in order best-to-worst), `human_id`/`loop_id`, `created_at`.

- **`response_corrections`** (human edits):  
  - `id`, `original_response_id` (FK to `llm_interactions.id` or similar), `corrected_text`, `human_id`/`loop_id`, `created_at`.  
  - So we have (original, corrected) pairs for supervised fine-tuning or reward.

**Ways to collect:**

- **Chat:** After each Loop reply, show “Was this helpful? 👍 👎”; store as preference (chosen = this reply, rejected = null or a baseline), or “Edit” → save to `response_corrections`.
- **Activities/comments:** “Was this post good?” up/down is already votes; add optional “preferred reply” when we show multiple candidate replies for the same prompt (e.g. A/B test), and store in `response_preferences`.
- **Disputes / resolutions:** “Correct” outcome or “approved” message can be used as a chosen response; link to `response_preferences` or a dedicated “outcome_preferences” table if you want.

**Export for training:**  
Export (prompt, chosen_response, rejected_response) and (original_response, corrected_response) in the format your reward model / RLHF pipeline expects (e.g. JSONL).

---

### 3.3 Enrich existing tables (so they’re “LLM-grade”)

So that **in-app** data is at the right **level and quality** for training:

- **`llm_interactions`:**  
  - Add optional: `language`, `source` (e.g. 'openloop_app'), `metadata` (JSONB).  
  - Ensure every engagement path (cron, chat, comments) writes here so we don’t miss calls.

- **Link feedback to responses:**  
  - Either add `response_preferences.prompt_id` → `llm_interactions.id` (when prompt is one row) or introduce a `prompts` table (prompt_text, id) and have `llm_interactions` and `response_preferences` point to it. So we can join: prompt → chosen/rejected responses.

- **Activities/comments:**  
  - Keep `domain`; add optional `language`; treat as part of “corpus” with `source = 'openloop_app'`.

---

## 4. Summary: level, quality, field, structures

- **Level:** Not yet “create an LLM” — we need pre-training-scale corpus and alignment-scale preferences. We’re building toward it.
- **Quality:** We need: dedup, safety/PII filtering, license/rights, and explicit human feedback (not only activity votes).
- **Field:** We already collect prompts, responses, domains, and some engagement; we’re missing: external corpus, per-response preferences, and corrections.
- **Structures:** We have `llm_interactions`, `activities`, `activity_votes`. We’re missing:  
  - **Corpus:** `ingested_corpus` (and optional `corpus_sources`).  
  - **Alignment:** `response_preferences`, optional `response_rankings`, `response_corrections`.  
  - **Metadata on existing:** language, source, and links from feedback rows to `llm_interactions`.

**How we duplicate OpenAI’s strategy:**  
(1) Add the **corpus** pipeline and tables for scale and variety.  
(2) Add the **preference and correction** tables and UI so we collect the same *type* of alignment data they use.  
(3) Use existing in-app data as one **source** in that pipeline, with clear metadata and licensing.  
(4) Add dedup, filtering, and export so the result is **training-ready** at the same conceptual level as OpenAI’s data strategy.

This doc is the single reference for “what level/quality/field we need” and “what’s missing / how we duplicate OpenAI’s strategy” in structures and process.
