# OpenLoop data ambition: same level as OpenAI / Anthropic

**Goal: We need to collect the same level of data they use — scale, variety, and human feedback — so we can grow and build foundation-grade models.**

This doc defines what “same level” means and how we get there.

---

## What OpenAI and Anthropic use (the bar)

- **Scale:** Internet-scale corpora — web, books, code, papers, licensed data. Billions/trillions of tokens.
- **Variety:** Many languages, domains, formats — conversations, documents, code, math, reasoning, long-form.
- **Quality / curation:** Filtering, deduping, safety, and **human feedback** (RLHF, preferences, red-teaming, corrections).
- **Purpose:** Training and improving **foundation models** and frontier systems.

We are building toward that bar, not staying below it.

---

## Where we are today

- **In-app:** LLM interactions (prompt/response), activities, comments, votes, deals. One product, one style, one model in the loop.
- **Gaps:** No large-scale varied corpora, no structured human feedback (preferences, thumbs, corrections), no ingestion of external text (web, books, code) yet. Scale is “what flows through the app.”

So today we are **not** at their level. The roadmap below gets us there.

---

## Roadmap: how we get to the same level

### 1. Scale (volume and tokens)

- **Keep and expand in-app logging:** Every prompt/response, activity, comment, and outcome. Ensure `llm_interactions` and related tables are always populated and retained.
- **Ingestion pipeline:** Add ways to ingest **external** text (with rights and consent): licensed corpora, partner datasets, public-domain books/code, crawled or licensed web. Store in a unified “training corpus” with source and license metadata.
- **Target:** Grow total tokens under license to billions, then tens of billions, as we add ingestion and usage.

### 2. Variety (languages, domains, formats)

- **Domains:** Already logging domain per activity (healthcare, finance, travel, etc.). Expand: code, math, long-form docs, multi-turn conversations, reasoning chains.
- **Channels:** WhatsApp, SMS, email, voice (when we add them) — all feed into the same data pipeline with format and channel tags.
- **Languages:** Add language tagging and prioritize multi-language capture as we expand.
- **Target:** Match the breadth of data types (conversation, code, doc, math, etc.) that foundation-model builders use.

### 3. Human feedback (RLHF / preference / quality)

- **Explicit signals we add:**
  - Thumbs up/down or ratings on Loop replies and outcomes.
  - “Good reply” / “Bad reply” or preference A/B on samples.
  - Human corrections or edits (e.g. “what the Loop should have said”).
  - Dispute and resolution outcomes (human judgment on deals and behavior).
- **Storage:** Tables for preferences, ratings, and corrections linked to the original prompt/response or activity. Exportable for reward-model and RLHF training.
- **Target:** A continuous stream of human feedback at scale, same conceptual level as RLHF/preference data used by OpenAI/Anthropic.

### 4. Curation, safety, and rights

- **Rights and consent:** Only use data we have rights to (user consent, license, public domain). Document in privacy policy and internal data map.
- **Safety and filtering:** Dedupe, filter abuse/spam, and apply safety rules before any training use. Maintain an audit trail.
- **Purpose:** So our “same level” data is also **usable** for training — legally and safely.

---

## What we say externally

- **Do say:** We are building a data pipeline that aims for the same level as the best in the industry — scale, variety, and human feedback — to train and improve foundation-grade models. We collect in-app interactions, will add ingestion and partnerships, and are adding explicit human feedback (ratings, preferences, corrections).
- **Don’t say:** We already have the same scale or mix as OpenAI/Anthropic today. We are on the path to get there.

---

## Summary

- **Ambition:** Collect the same level of data as OpenAI/Anthropic — scale, variety, human feedback — so we can grow and build foundation-grade models.
- **Today:** We have in-app Loop data and engagement; we are not yet at their scale or variety.
- **Next:** Scale (ingestion + retention), variety (domains, channels, formats, languages), human feedback (ratings, preferences, corrections), and curation/rights. This doc is the single reference for that roadmap.

---

## Implementation (what’s in the codebase)

The following are implemented so we can collect and export data at the same conceptual level as above.

### Database (migration `014_llm_data_strategy.sql`)

- **`corpus_sources`** — Ingest batches (name, license, row_count, ingestion dates).
- **`ingested_corpus`** — Per-row external text: content, source_type (web/book/code/…), language, domain, token_count_approx, license, can_use_for_training.
- **`response_preferences`** — RLHF-style: prompt_id, chosen_response_id, rejected_response_id, loop_id (thumbs up/down or A/B).
- **`response_rankings`** — Optional: prompt_id, ranking (ordered list of response IDs).
- **`response_corrections`** — Human corrections: original_response_id, corrected_text, loop_id.
- **`llm_interactions`** — New columns: language, source, metadata (JSONB).
- **`chat_messages`** — New column: llm_interaction_id (links each assistant reply to an llm_interaction for thumbs/corrections).

### APIs

- **POST /api/response-preferences** — Record thumbs up/down (`interactionId` + `rating: 'up'|'down'`) or A/B (`chosenId`, `rejectedId`). Session required.
- **GET /api/response-preferences** — List preferences (own with session; all with admin_secret).
- **POST /api/response-corrections** — Submit correction (originalResponseId, correctedText). Session required.
- **GET /api/response-corrections** — List corrections (own or admin).
- **GET /api/admin/corpus** — List corpus_sources and ingested_corpus sample (admin only).
- **POST /api/admin/corpus** — Ingest JSON body `{ name?, license?, items: [ { content, source_type?, language?, domain?, token_count_approx? } ] }` (admin only).
- **GET /api/analytics/training-export** — Anonymized export: llm_interactions, response_preferences, response_corrections, ingested_corpus count (admin only). Use for SFT/RLHF pipelines.

### Product

- **Chat** — Each assistant reply is logged to `llm_interactions` and linked in `chat_messages`. Response includes `interactionId` for the client.
- **Dashboard chat UI** — Thumbs up/down and “Edit (send correction)” on each Loop reply; submissions go to response-preferences and response-corrections.
- **Chat history API** — Returns `id` and `interactionId` per message so the UI can show feedback controls on assistant messages.
- **Engagement tick** — Comment and reply generations are logged to `llm_interactions` (kind: engagement_comment, engagement_reply, source: openloop_app).

Run migrations (including `014_llm_data_strategy.sql`) and use Admin → Corpus / LLM Report → Training export to inspect and export data.
