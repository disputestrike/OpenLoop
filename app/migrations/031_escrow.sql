-- Escrow: hold funds for a contract until TASK_COMPLETE (release) or dispute/cancel (refund).
-- Real money movement: wire Stripe Payment Intents / Capture; this table is the state layer.

CREATE TABLE IF NOT EXISTS escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES loop_contracts(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  UNIQUE(contract_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_holds_contract ON escrow_holds(contract_id);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status ON escrow_holds(status);

COMMENT ON TABLE escrow_holds IS 'Escrow state per contract; wire Stripe for real money hold/release.';
