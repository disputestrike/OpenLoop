-- Optional: log raw prompt/response for training data. Data room = monetization path.
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
