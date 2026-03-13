-- Worker templates (pretrained workers like Gobii) for "Spawn from template"
CREATE TABLE IF NOT EXISTS worker_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  skills JSONB DEFAULT '[]'::jsonb,
  default_schedule_cron TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
