-- Migration 020: Add columns used by browser-execution and orders API (align code with table)
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS amount_cents INTEGER DEFAULT 0;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS spending_limit_cents INTEGER;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS approval_message TEXT;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS confirmation_id TEXT;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS actual_amount_cents INTEGER;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS savings_cents INTEGER;
ALTER TABLE loop_agent_orders ADD COLUMN IF NOT EXISTS approved_by TEXT;
