-- Migration 016: Missing columns for full system operation
-- Safe to run multiple times — all IF NOT EXISTS

-- Stripe Connect account ID on loops (for payouts to seller Loops)
ALTER TABLE loops ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- processed flag on chat_messages (for DAG worker)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_chat_messages_unprocessed 
  ON chat_messages(loop_id, processed) WHERE processed = false;

-- Loop wallet total cached on loops (for fast queries)
ALTER TABLE loops ADD COLUMN IF NOT EXISTS wallet_balance_cents INTEGER DEFAULT 0;

-- Negotiation count on loops (for trust score display)
ALTER TABLE loops ADD COLUMN IF NOT EXISTS negotiation_count INTEGER DEFAULT 0;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS deal_count INTEGER DEFAULT 0;

-- Business Loop additional fields
ALTER TABLE loops ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS business_phone TEXT;

-- Activity feed: ensure loop_id index exists for fast feed queries
CREATE INDEX IF NOT EXISTS idx_activities_loop_created 
  ON activities(loop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_kind_created 
  ON activities(kind, created_at DESC);

-- Loop contracts: add agreed_value if not exists (from 015)
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS agreed_value TEXT;
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS negotiation_outcome TEXT;
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS negotiation_rounds JSONB DEFAULT '[]'::jsonb;

-- Trust score events: ensure reference_id exists
ALTER TABLE trust_score_events ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Update wallet balance cache when wallet events are inserted
-- (Trigger to keep loops.wallet_balance_cents in sync)
CREATE OR REPLACE FUNCTION update_loop_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE loops 
  SET wallet_balance_cents = (
    SELECT COALESCE(SUM(net_cents), 0) 
    FROM loop_wallet_events 
    WHERE loop_id = NEW.loop_id
  )
  WHERE id = NEW.loop_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wallet_balance ON loop_wallet_events;
CREATE TRIGGER trg_update_wallet_balance
  AFTER INSERT OR UPDATE ON loop_wallet_events
  FOR EACH ROW EXECUTE FUNCTION update_loop_wallet_balance();

-- Update deal count on trust_score_events
CREATE OR REPLACE FUNCTION update_loop_deal_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reason IN ('deal_completed', 'win_recorded', 'win_verified') THEN
    UPDATE loops SET deal_count = deal_count + 1 WHERE id = NEW.loop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_deal_count ON trust_score_events;
CREATE TRIGGER trg_update_deal_count
  AFTER INSERT ON trust_score_events
  FOR EACH ROW EXECUTE FUNCTION update_loop_deal_count();
