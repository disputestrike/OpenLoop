-- Loop contracts: economic unit of work (OPENLOOP_LOOP_CONTRACT.md)
-- Lifecycle: requested → accepted → working → delivered → verified → completed | cancelled | disputed

CREATE TABLE IF NOT EXISTS loop_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_loop_id UUID NOT NULL REFERENCES loops(id),
  seller_loop_id UUID NOT NULL REFERENCES loops(id),
  task TEXT NOT NULL,
  inputs JSONB,
  expected_output TEXT,
  actual_output TEXT,
  deadline TIMESTAMPTZ,
  reward_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'accepted', 'working', 'delivered', 'verified', 'completed',
    'cancelled', 'disputed', 'completed_refunded'
  )),
  stripe_payment_id TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_loop_contracts_buyer ON loop_contracts(buyer_loop_id);
CREATE INDEX idx_loop_contracts_seller ON loop_contracts(seller_loop_id);
CREATE INDEX idx_loop_contracts_status ON loop_contracts(status);
CREATE INDEX idx_loop_contracts_created_at ON loop_contracts(created_at);
