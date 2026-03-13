-- LLM Data Strategy: OpenAI-style pre-training corpus + alignment (preferences, corrections)
-- See LLM_DATA_STRATEGY_OPENAI_DUPLICATE.md and DATA_VS_OPENAI_ANTHROPIC.md

-- 0) Ensure llm_interactions exists (in case 005 was not run)
CREATE TABLE IF NOT EXISTS llm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_loop ON llm_interactions(loop_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_kind ON llm_interactions(kind);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_created ON llm_interactions(created_at DESC);

-- 1) Ingested corpus: external text for pre-training (web, books, code, partners)
CREATE TABLE IF NOT EXISTS corpus_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license TEXT,
  ingestion_started_at TIMESTAMPTZ DEFAULT now(),
  ingestion_finished_at TIMESTAMPTZ,
  row_count BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ingested_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES corpus_sources(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'openloop_app' CHECK (source_type IN ('openloop_app', 'web', 'book', 'code', 'paper', 'partner', 'other')),
  license TEXT,
  language TEXT,
  domain TEXT,
  token_count_approx INT,
  content_hash TEXT,
  can_use_for_training BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_source ON ingested_corpus(source_id);
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_source_type ON ingested_corpus(source_type);
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_language ON ingested_corpus(language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_domain ON ingested_corpus(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_can_train ON ingested_corpus(can_use_for_training) WHERE can_use_for_training = true;
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_hash ON ingested_corpus(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ingested_corpus_created ON ingested_corpus(created_at DESC);

-- 2) Enrich llm_interactions for training metadata
ALTER TABLE llm_interactions ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE llm_interactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'openloop_app';
ALTER TABLE llm_interactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3) Response preferences (chosen vs rejected) — RLHF-style
CREATE TABLE IF NOT EXISTS response_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES llm_interactions(id) ON DELETE SET NULL,
  chosen_response_id UUID REFERENCES llm_interactions(id) ON DELETE SET NULL,
  rejected_response_id UUID REFERENCES llm_interactions(id) ON DELETE SET NULL,
  human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_response_preferences_prompt ON response_preferences(prompt_id);
CREATE INDEX IF NOT EXISTS idx_response_preferences_chosen ON response_preferences(chosen_response_id);
CREATE INDEX IF NOT EXISTS idx_response_preferences_created ON response_preferences(created_at DESC);

-- 4) Response rankings (A > B > C) — optional
CREATE TABLE IF NOT EXISTS response_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES llm_interactions(id) ON DELETE SET NULL,
  ranking UUID[] NOT NULL,
  human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_response_rankings_prompt ON response_rankings(prompt_id);

-- 5) Human corrections (original -> corrected)
CREATE TABLE IF NOT EXISTS response_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_response_id UUID NOT NULL REFERENCES llm_interactions(id) ON DELETE CASCADE,
  corrected_text TEXT NOT NULL,
  human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_response_corrections_original ON response_corrections(original_response_id);
CREATE INDEX IF NOT EXISTS idx_response_corrections_created ON response_corrections(created_at DESC);

-- 6) Chat message -> llm_interaction link (for thumbs/corrections on chat replies)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS llm_interaction_id UUID REFERENCES llm_interactions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_llm_interaction ON chat_messages(llm_interaction_id) WHERE llm_interaction_id IS NOT NULL;
