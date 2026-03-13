-- Deliverables: files/reports from Loops (PDF, CSV links or stored path)
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'file',
  title TEXT NOT NULL,
  file_path TEXT,
  body TEXT,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deliverables_loop ON deliverables(loop_id);
