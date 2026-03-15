-- OpenLoop LLM Training Ecosystem — full schema for proprietary model training
-- Data: protocol events, HITL, conversation logs, RLHF, knowledge docs, sandbox sims, agent metrics
-- Railway-safe; no external extensions required (pgvector optional in 034 if needed).

-- 1) Human-in-the-loop interventions (edits, overrides, approvals)
CREATE TABLE IF NOT EXISTS human_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_event_id UUID REFERENCES protocol_task_events(id) ON DELETE SET NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  action_taken TEXT NOT NULL, -- 'correction' | 'override' | 'approval' | 'rejection'
  rationale TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_human_interventions_task_event ON human_interventions(task_event_id);
CREATE INDEX IF NOT EXISTS idx_human_interventions_loop ON human_interventions(loop_id);
CREATE INDEX IF NOT EXISTS idx_human_interventions_created ON human_interventions(created_at DESC);

-- 2) Sandbox / simulation runs (generated tasks, multi-agent logs, outcomes)
CREATE TABLE IF NOT EXISTS sandbox_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_type TEXT NOT NULL, -- 'protocol_handshake' | 'negotiation' | 'booking' | 'research'
  agents_involved UUID[] DEFAULT '{}',
  outcome TEXT, -- 'success' | 'failure' | 'partial'
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sandbox_simulations_type ON sandbox_simulations(scenario_type);
CREATE INDEX IF NOT EXISTS idx_sandbox_simulations_created ON sandbox_simulations(created_at DESC);

-- 3) Conversation logs (unified human/AI for training; dual-write with chat_messages)
CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  user_id UUID,
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  related_event_id UUID REFERENCES protocol_task_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_loop ON conversation_logs(loop_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created ON conversation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_role ON conversation_logs(role);

-- 4) RLHF feedback (ratings, corrected text, comments for reward model)
CREATE TABLE IF NOT EXISTS rlhf_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  task_id UUID REFERENCES loop_contracts(id) ON DELETE SET NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  corrected_text TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rlhf_feedback_loop ON rlhf_feedback(loop_id);
CREATE INDEX IF NOT EXISTS idx_rlhf_feedback_task ON rlhf_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_rlhf_feedback_created ON rlhf_feedback(created_at DESC);

-- 5) Knowledge documents (external/internal/RAG; embedding_vector optional via pgvector later)
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- 'external' | 'internal' | 'loop_generated'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created ON knowledge_documents(created_at DESC);

-- 6) Agent metrics (aggregated performance for reward / filtering)
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  UNIQUE(loop_id),
  tasks_completed INT DEFAULT 0,
  tasks_failed INT DEFAULT 0,
  disputes INT DEFAULT 0,
  trust_score INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_loop ON agent_metrics(loop_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_trust ON agent_metrics(trust_score DESC);

COMMENT ON TABLE human_interventions IS 'HITL data for RLHF: edits, overrides, approvals.';
COMMENT ON TABLE sandbox_simulations IS 'Sandbox/sim runs for training and synthetic data.';
COMMENT ON TABLE conversation_logs IS 'Unified conversation log for LLM training (dual-write with chat).';
COMMENT ON TABLE rlhf_feedback IS 'Ratings and corrections for reward model and fine-tuning.';
COMMENT ON TABLE knowledge_documents IS 'External/internal knowledge for RAG (embeddings optional).';
COMMENT ON TABLE agent_metrics IS 'Per-loop metrics for training filtering and reward.';
