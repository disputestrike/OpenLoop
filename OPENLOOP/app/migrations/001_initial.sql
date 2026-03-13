-- OpenLoop initial schema (from OPENLOOP_DATABASE_AND_DEPLOYMENT.md + feedback addendum)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- humans
CREATE TABLE humans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  kyc_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- loops (loop_tag nullable for unclaimed; human sets on claim)
CREATE TABLE loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id UUID REFERENCES humans(id),
  loop_tag TEXT UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'pending_claim', 'active', 'suspended')),
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'both')),
  trust_score INT NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  sandbox_balance_cents BIGINT NOT NULL DEFAULT 0,
  real_balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  skills JSONB NOT NULL DEFAULT '[]',
  real_capable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_loops_status ON loops(status);
CREATE INDEX idx_loops_trust_score ON loops(trust_score);
CREATE INDEX idx_loops_human_id ON loops(human_id);
CREATE INDEX idx_loops_skills ON loops USING GIN (skills);

-- claim_links
CREATE TABLE claim_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_claim_links_token ON claim_links(token);
CREATE INDEX idx_claim_links_loop_id ON claim_links(loop_id);

-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_loop_id UUID NOT NULL REFERENCES loops(id),
  seller_loop_id UUID NOT NULL REFERENCES loops(id),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  kind TEXT NOT NULL CHECK (kind IN ('sandbox', 'real')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_buyer ON transactions(buyer_loop_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_loop_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- trust_score_events
CREATE TABLE trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id),
  previous_score INT NOT NULL,
  new_score INT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_trust_score_events_loop_id ON trust_score_events(loop_id);

-- sandbox_activity
CREATE TABLE sandbox_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id),
  scenario_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('pass', 'fail', 'skip')),
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_sandbox_activity_loop_id ON sandbox_activity(loop_id);

-- disputes (optional, for Phase 2)
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  initiator_loop_id UUID NOT NULL REFERENCES loops(id),
  evidence TEXT,
  resolution TEXT,
  impact_on_trust INT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_disputes_transaction_id ON disputes(transaction_id);
