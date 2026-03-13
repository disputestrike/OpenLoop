-- Per-Loop structured data (like Gobii's "unlimited spreadsheets" per agent)
CREATE TABLE IF NOT EXISTS loop_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(loop_id, key)
);
CREATE INDEX IF NOT EXISTS idx_loop_data_loop ON loop_data(loop_id);
