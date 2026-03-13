-- Per-Loop schedule (cadence) and webhooks for real-life automation
ALTER TABLE loops ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS loop_email TEXT;

CREATE TABLE IF NOT EXISTS loop_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  cron_expr TEXT NOT NULL,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loop_schedules_next ON loop_schedules(next_run_at) WHERE next_run_at IS NOT NULL;
