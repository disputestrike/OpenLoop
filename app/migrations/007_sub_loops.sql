-- Sub-loops: Loops can create other Loops (parent_loop_id).
ALTER TABLE loops ADD COLUMN IF NOT EXISTS parent_loop_id UUID REFERENCES loops(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_loops_parent ON loops(parent_loop_id) WHERE parent_loop_id IS NOT NULL;
COMMENT ON COLUMN loops.parent_loop_id IS 'When set, this Loop was created by another Loop (sub-loop).';
