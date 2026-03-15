-- Migration 022: LLM Training Data Collection
-- Stores all agent interactions for training our own language model
-- Includes prompt, response, context, quality scores, and outcomes

CREATE TABLE IF NOT EXISTS llm_training_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent & Loop Info
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  loop_tag VARCHAR(255),
  
  -- Interaction Type
  interaction_type VARCHAR(50) NOT NULL, -- 'post', 'comment', 'reply', 'engagement'
  
  -- Core Training Data
  prompt TEXT NOT NULL, -- The actual prompt/context given to agent
  response TEXT NOT NULL, -- The agent's response (post/comment/reply body)
  
  -- Context & Domain
  domain VARCHAR(100), -- 'health', 'travel', 'finance', etc.
  category VARCHAR(100),
  context JSONB DEFAULT '{}', -- Full context: agent skills, past outcomes, related posts, etc.
  
  -- Agent History Context
  agent_karma INT DEFAULT 0,
  agent_trust_score INT DEFAULT 0,
  agent_past_wins JSONB DEFAULT '[]', -- Recent verified outcomes
  agent_skills JSONB DEFAULT '[]', -- Agent's known skills
  
  -- Parent Interaction (for replies/comments)
  parent_interaction_id UUID REFERENCES llm_training_interactions(id) ON DELETE SET NULL,
  parent_post_title TEXT, -- Context: what was the original post about
  parent_post_domain VARCHAR(100),
  
  -- Quality Signals
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  net_sentiment INT GENERATED ALWAYS AS (upvotes - downvotes) STORED,
  quality_score NUMERIC(3,2) DEFAULT 0.5, -- 0.0 to 1.0, calculated from signals
  
  -- Verification & Outcomes
  verified_outcome BOOLEAN DEFAULT FALSE,
  outcome_amount_cents INT,
  outcome_type VARCHAR(100), -- 'money_saved', 'time_saved', 'deal_closed', etc.
  outcome_specificity VARCHAR(20) DEFAULT 'generic', -- 'generic', 'specific', 'verified'
  
  -- Training Metadata
  is_training_ready BOOLEAN DEFAULT FALSE, -- Passes quality threshold
  training_batch_date DATE,
  human_review JSONB, -- {approved: true/false, notes: "...", reviewed_at: "..."}
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for fast retrieval
  CONSTRAINT quality_score_valid CHECK (quality_score >= 0.0 AND quality_score <= 1.0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_llm_training_loop_id ON llm_training_interactions(loop_id);
CREATE INDEX IF NOT EXISTS idx_llm_training_domain ON llm_training_interactions(domain);
CREATE INDEX IF NOT EXISTS idx_llm_training_quality_score ON llm_training_interactions(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_llm_training_is_ready ON llm_training_interactions(is_training_ready) WHERE is_training_ready = TRUE;
CREATE INDEX IF NOT EXISTS idx_llm_training_interaction_type ON llm_training_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_llm_training_created_at ON llm_training_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_training_verified ON llm_training_interactions(verified_outcome) WHERE verified_outcome = TRUE;
CREATE INDEX IF NOT EXISTS idx_llm_training_net_sentiment ON llm_training_interactions(net_sentiment DESC);

-- NOTE: Analytics VIEWs removed from migration to prevent transaction rollback.
-- VIEWs can be created manually via admin if needed.
