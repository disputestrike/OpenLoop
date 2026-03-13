-- Migration 015: Negotiation Engine Support
-- Adds columns and indexes needed for Loop-to-Loop negotiation

-- Contract negotiation status
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS negotiation_rounds JSONB DEFAULT '[]'::jsonb;
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS agreed_value TEXT;
ALTER TABLE loop_contracts ADD COLUMN IF NOT EXISTS negotiation_outcome TEXT; -- 'deal' | 'impasse' | 'pending'

-- Add 'negotiating' to contract status flow
-- (existing status column is TEXT, no constraint change needed)

-- Business Loop discoverability — verified handles
ALTER TABLE loops ADD COLUMN IF NOT EXISTS verified_business BOOLEAN DEFAULT false;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS business_category TEXT; -- 'telecom' | 'insurance' | 'banking' | 'streaming' | 'utilities' | 'retail' | 'other'
ALTER TABLE loops ADD COLUMN IF NOT EXISTS public_description TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS website TEXT;

-- Notification when business joins OpenLoop (for pending negotiation queue)
CREATE TABLE IF NOT EXISTS business_join_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  requested_by_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Loop-to-Loop message inbox (for async negotiation)
CREATE TABLE IF NOT EXISTS loop_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  to_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES loop_contracts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'negotiation', -- 'negotiation' | 'offer' | 'counter' | 'accept' | 'reject' | 'general'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast Loop discovery
CREATE INDEX IF NOT EXISTS idx_loops_is_business_active ON loops(is_business, status) WHERE is_business = true;
CREATE INDEX IF NOT EXISTS idx_loops_business_category ON loops(business_category) WHERE business_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loop_messages_to ON loop_messages(to_loop_id, read_at);
CREATE INDEX IF NOT EXISTS idx_loop_messages_contract ON loop_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_biz_waitlist_name ON business_join_waitlist(lower(business_name));
CREATE INDEX IF NOT EXISTS idx_contracts_status ON loop_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_negotiating ON loop_contracts(buyer_loop_id, status) WHERE status = 'negotiating';

-- Seed some well-known business Loop placeholders (unclaimed, so businesses can claim them)
-- These create the @handle so users can search and find them, but they show as "Unclaimed Business Loop"
-- When the business claims it, it becomes theirs
INSERT INTO loops (loop_tag, status, persona, is_business, business_category, public_description, trust_score, role)
VALUES 
  ('comcast', 'unclaimed', 'business', true, 'telecom', 'Comcast customer service and billing Loop', 50, 'business'),
  ('att', 'unclaimed', 'business', true, 'telecom', 'AT&T customer service Loop', 50, 'business'),
  ('netflix', 'unclaimed', 'business', true, 'streaming', 'Netflix billing and account Loop', 50, 'business'),
  ('verizon', 'unclaimed', 'business', true, 'telecom', 'Verizon Wireless Loop', 50, 'business'),
  ('tmobile', 'unclaimed', 'business', true, 'telecom', 'T-Mobile customer Loop', 50, 'business'),
  ('progressive', 'unclaimed', 'business', true, 'insurance', 'Progressive Insurance Loop', 50, 'business'),
  ('geico', 'unclaimed', 'business', true, 'insurance', 'GEICO Insurance Loop', 50, 'business'),
  ('spotify', 'unclaimed', 'business', true, 'streaming', 'Spotify subscription Loop', 50, 'business'),
  ('amazon', 'unclaimed', 'business', true, 'retail', 'Amazon customer service Loop', 50, 'business'),
  ('bankofamerica', 'unclaimed', 'business', true, 'banking', 'Bank of America Loop', 50, 'business')
ON CONFLICT (loop_tag) DO NOTHING;
