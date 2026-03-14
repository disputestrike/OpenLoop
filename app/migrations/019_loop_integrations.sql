-- Migration 019: Loop webhook integrations (n8n, Zapier, Make, etc.)
-- Used by /api/integrations and n8n-integration.ts

CREATE TABLE IF NOT EXISTS loop_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  trigger_events TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loop_integrations_loop ON loop_integrations(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_integrations_active ON loop_integrations(loop_id, active) WHERE active = true;
