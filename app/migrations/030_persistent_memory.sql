-- Persistent Memory for Universal Agent Protocol Network
-- Single source of truth: loop_id + agent_id + channel (channel-agnostic, same state across Telegram, web, mobile, SDK)
-- See OpenLoop Persistent Memory Plan and architecture diagram.

CREATE TABLE IF NOT EXISTS persistent_memory (
    id BIGSERIAL PRIMARY KEY,
    loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES loops(id) ON DELETE SET NULL,
    channel TEXT,
    session_id UUID,
    memory JSONB NOT NULL DEFAULT '{}',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persistent_memory_loop_agent_channel
    ON persistent_memory(loop_id, agent_id, channel);

CREATE INDEX IF NOT EXISTS idx_persistent_memory_loop_id
    ON persistent_memory(loop_id);

CREATE INDEX IF NOT EXISTS idx_persistent_memory_updated
    ON persistent_memory(updated_at DESC);

COMMENT ON TABLE persistent_memory IS 'Universal persistent context per loop+agent+channel; JSONB holds last_selection, task, partial_responses, etc.';
