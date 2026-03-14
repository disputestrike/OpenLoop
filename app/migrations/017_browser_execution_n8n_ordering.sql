-- Migration 017: Browser Execution Engine + n8n Integration + Agent Ordering
-- Adds all tables for Tier 4 real-world execution

-- ── Browser execution log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_browser_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL UNIQUE,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  url TEXT NOT NULL,
  intent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | executing | completed | failed | blocked_unauthorized | pending_approval | error
  outcome TEXT,
  extracted_data JSONB,
  amount_saved_cents INTEGER DEFAULT 0,
  amount_spent_cents INTEGER DEFAULT 0,
  screenshot_stored BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  pending_approval_data JSONB,
  approved_at TIMESTAMPTZ,
  approved_by TEXT DEFAULT 'user',
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_browser_exec_loop ON loop_browser_executions(loop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_browser_exec_status ON loop_browser_executions(loop_id, status);

-- ── n8n workflow execution log ─────────────────────────────
CREATE TABLE IF NOT EXISTS loop_n8n_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  payload JSONB,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_n8n_exec_loop ON loop_n8n_executions(loop_id, created_at DESC);

-- ── Agent orders (pending approvals) ──────────────────────
CREATE TABLE IF NOT EXISTS loop_agent_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL, -- 'purchase' | 'booking' | 'cancellation' | 'form_submit'
  description TEXT NOT NULL,
  estimated_cost_cents INTEGER DEFAULT 0,
  target_url TEXT,
  target_business TEXT,
  order_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  -- pending_approval | approved | executing | completed | cancelled | failed
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  execution_id TEXT REFERENCES loop_browser_executions(execution_id) ON DELETE SET NULL,
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_orders_loop ON loop_agent_orders(loop_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_orders_pending ON loop_agent_orders(loop_id) WHERE status = 'pending_approval';

-- ── Spending limit enforcement: track daily spend ─────────
CREATE TABLE IF NOT EXISTS loop_daily_spend (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_spent_cents INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  PRIMARY KEY (loop_id, spend_date)
);

-- ── Custom n8n workflows per Loop/Business ─────────────────
CREATE TABLE IF NOT EXISTS loop_custom_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_id TEXT NOT NULL, -- n8n workflow ID
  description TEXT,
  trigger_keywords TEXT[], -- Words that activate this workflow
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Skill tier: add Tier 4 capability ─────────────────────
-- Tier 0: Chat only
-- Tier 1: Negotiate & Draft
-- Tier 2: Act Within Limits (spending cap required)
-- Tier 3: Full Agent Capabilities
-- Tier 4: Real-World Execution (browser + order + integrations)
-- NOTE: existing skill_tier column already handles 0-3.
-- Tier 4 is unlocked when skill_tier >= 2 AND browser_enabled = true

ALTER TABLE loops ADD COLUMN IF NOT EXISTS browser_enabled BOOLEAN DEFAULT false;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS n8n_enabled BOOLEAN DEFAULT false;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS daily_spend_limit_cents INTEGER DEFAULT 0;
-- 0 = uses spending_limit_cents per transaction (existing)
-- >0 = caps total daily spend regardless of per-transaction limit

-- Trigger: enforce daily spend limit
CREATE OR REPLACE FUNCTION check_daily_spend_limit()
RETURNS TRIGGER AS $$
DECLARE
  daily_limit INTEGER;
  today_spend INTEGER;
BEGIN
  IF NEW.event_type NOT IN ('purchase', 'order') THEN RETURN NEW; END IF;
  SELECT daily_spend_limit_cents INTO daily_limit FROM loops WHERE id = NEW.loop_id;
  IF daily_limit = 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(total_spent_cents, 0) INTO today_spend
  FROM loop_daily_spend WHERE loop_id = NEW.loop_id AND spend_date = CURRENT_DATE;
  IF COALESCE(today_spend, 0) + NEW.amount_cents > daily_limit THEN
    RAISE EXCEPTION 'Daily spending limit of $% exceeded', (daily_limit / 100.0);
  END IF;
  INSERT INTO loop_daily_spend (loop_id, spend_date, total_spent_cents, transaction_count)
  VALUES (NEW.loop_id, CURRENT_DATE, NEW.amount_cents, 1)
  ON CONFLICT (loop_id, spend_date) DO UPDATE
  SET total_spent_cents = loop_daily_spend.total_spent_cents + NEW.amount_cents,
      transaction_count = loop_daily_spend.transaction_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_daily_spend ON loop_wallet_events;
CREATE TRIGGER trg_check_daily_spend
  BEFORE INSERT ON loop_wallet_events
  FOR EACH ROW EXECUTE FUNCTION check_daily_spend_limit();
