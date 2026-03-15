# OpenLoop LLM Training — End-to-End Blueprint

This document describes the **data collection, storage, processing, and training pipeline** for building a proprietary OpenLoop LLM that can match or surpass general-purpose LLMs **in the agent/task-execution domain**.

---

## 1. Data We Collect

| Source | Table(s) | Purpose |
|--------|----------|---------|
| Protocol messages | `protocol_task_events` | Task requests, offers, completions, payments — core multi-agent reasoning |
| Task lifecycle | `loop_contracts` | State (requested → completed → paid → disputed), resolution notes |
| Agent metadata | `loops` | agent_core_domains, agent_signature_skills, trust_score, webhook_url |
| Human-in-the-loop | `human_interventions`, `rlhf_feedback`, `response_corrections` | Edits, overrides, approvals, ratings, corrected text |
| Conversations | `conversation_logs`, `chat_messages` | Human/AI chat for SFT and context |
| Sandbox / simulations | `sandbox_simulations` | Generated tasks, multi-agent runs, outcomes |
| Aggregated metrics | `agent_metrics` | tasks_completed, disputes, trust_score per loop (for filtering and reward) |
| Knowledge | `knowledge_documents` | External/internal docs for RAG (optional embeddings) |

Existing tables: `protocol_task_events` (029), `loop_contracts`, `loops`, `llm_training_interactions` (022), `response_corrections`, `chat_messages`.  
New (migration 033): `human_interventions`, `sandbox_simulations`, `conversation_logs`, `rlhf_feedback`, `knowledge_documents`, `agent_metrics`.

---

## 2. Database Schema (Implemented)

- **human_interventions** — id, task_event_id, loop_id, action_taken, rationale, duration_seconds, created_at  
- **sandbox_simulations** — id, scenario_type, agents_involved (UUID[]), outcome, payload (JSONB), created_at  
- **conversation_logs** — id, loop_id, user_id, message, role (user/assistant/system), related_event_id, created_at  
- **rlhf_feedback** — id, loop_id, task_id, rating (1–5), corrected_text, comment, created_at  
- **knowledge_documents** — id, source_type, content, metadata (JSONB), created_at  
- **agent_metrics** — id, loop_id (UNIQUE), tasks_completed, tasks_failed, disputes, trust_score, last_updated  

---

## 3. Ingestion (Wired)

- **Protocol:** Every `POST /api/protocol/send` already writes to `protocol_task_events`.  
- **Chat:** Every chat message is dual-written to `chat_messages` and `conversation_logs`.  
- **Human corrections:** `POST /api/response-corrections` writes to `response_corrections`, `rlhf_feedback`, and `human_interventions`.  
- **Sandbox:** `npm run demo:protocol` inserts a row into `sandbox_simulations` on success.  
- **Agent metrics:** Run `npm run llm:aggregate-metrics` (cron or post-deploy) to refresh `agent_metrics` from contracts and protocol events.

---

## 4. Export Pipeline (Training Data)

**Script:** `node scripts/export-llm-training-data.js`

- **Options:** `--since=ISO_DATE`, `--limit=N`, `--out=file.jsonl`  
- **Output:** JSONL with one object per line; `type` field: `protocol_event`, `conversation`, `rlhf_feedback`, `human_intervention`, `sandbox_simulation`.  
- **Use:** Feed into your fine-tuning pipeline (tokenization, batching, train/val split).  

**Command:** `npm run llm:export` or `npm run llm:export -- --since=2026-01-01 --limit=100000`

---

## 5. Processing & Training Strategy (Your Side)

1. **Cleaning:** Remove corrupted/incomplete events; optional PII redaction.  
2. **Augmentation:** Add task-type tokens (e.g. `[TASK_REQUEST]`, `[TASK_COMPLETE]`); include last N events per loop for context.  
3. **Tokenization:** Convert payloads and messages to token sequences (your tokenizer / base model).  
4. **Supervised fine-tuning:** Train on sequences like `[TASK_REQUEST] → [TASK_OFFER] → [TASK_COMPLETE]` with next-step labels.  
5. **RLHF:** Use `rlhf_feedback` and `human_interventions` as reward signal; train reward model and policy.  
6. **RAG (optional):** Ingest `knowledge_documents` into a vector store (pgvector or external); retrieve at inference for context.  
7. **Continual learning:** Weekly/monthly batch retraining from new exports; versioned checkpoints.

---

## 6. Compliance & Disclosure

- **Terms of Service:** Section 6 states that anonymized interaction data, including protocol messages, conversation logs, and human feedback, may be used to improve and fine-tune our proprietary agent models.  
- **Privacy:** Redact or anonymize PII before long-term storage or export where required (GDPR/CCPA).  
- **Audit:** All protocol events and interventions are timestamped; `audit_log` supports traceability.

---

## 7. Railway Deployment

- **Migrations:** Migration `033_llm_training_ecosystem.sql` is in `run-migrate.js`. Run `npm run db:migrate` on deploy (or via Railway start command).  
- **Cron (optional):** Schedule `npm run llm:aggregate-metrics` (e.g. daily) and `npm run llm:export` for periodic training batches.  
- **Storage:** Export files can be written to local disk or streamed to S3/MinIO if you add a blob service.

---

## 8. Summary

| Component | Status |
|-----------|--------|
| Data schema (tables) | ✅ Migration 033 |
| Protocol ingestion | ✅ Already in gateway |
| Conversation ingestion | ✅ Dual-write in chat route |
| RLHF / HITL ingestion | ✅ response-corrections → rlhf_feedback, human_interventions |
| Sandbox logging | ✅ demo:protocol → sandbox_simulations |
| Agent metrics aggregation | ✅ Script aggregate-agent-metrics.js |
| Export pipeline | ✅ export-llm-training-data.js → JSONL |
| Compliance disclosure | ✅ Terms §6 |
| Your side | Cleaning, tokenization, SFT/RLHF, RAG, continual retraining |

With this in place, OpenLoop collects and exports everything needed to train a proprietary LLM that can surpass general-purpose models **in task execution, multi-agent reasoning, and domain-specific workflows**.
