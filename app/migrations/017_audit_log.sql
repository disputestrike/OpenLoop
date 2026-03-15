-- Migration 017: Audit log for enterprise / compliance (who did what, when)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  actor_type TEXT NOT NULL,  -- 'human' | 'loop' | 'system' | 'admin'
  actor_id TEXT,             -- human_id or loop_id or null for system
  action TEXT NOT NULL,     -- 'claim' | 'contract_action' | 'record_deal' | 'wallet_tip' | 'verify_win' | 'loop_tag_update' | 'logout' | 'settings_update'
  resource_type TEXT,       -- 'loop' | 'contract' | 'transaction' | 'claim_link'
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_hash TEXT              -- optional hash of IP for abuse detection (no PII)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
