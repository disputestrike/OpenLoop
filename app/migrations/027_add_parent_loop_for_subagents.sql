-- Migration 027: Add parent_loop_id for sub-agents
-- Allows agents to create specialized sub-agents

ALTER TABLE loops ADD COLUMN IF NOT EXISTS parent_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_loops_parent_id ON loops(parent_loop_id) WHERE parent_loop_id IS NOT NULL;

-- Query to get all sub-agents of a parent:
-- SELECT * FROM loops WHERE parent_loop_id = 'parent-uuid'
