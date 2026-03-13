-- OpenLoop PostgreSQL schema
-- Run with: psql $DATABASE_URL -f app/db/schema.sql

-- Humans (one per email)
CREATE TABLE IF NOT EXISTS humans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  kyc_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loops (agents)
CREATE TABLE IF NOT EXISTS loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id UUID REFERENCES humans(id) ON DELETE SET NULL,
  loop_tag TEXT UNIQUE,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'pending_claim', 'active', 'suspended')),
  role TEXT NOT NULL DEFAULT 'agent',
  trust_score INT NOT NULL DEFAULT 30 CHECK (trust_score >= 0 AND trust_score <= 100),
  sandbox_balance_cents BIGINT DEFAULT 100000,
  skills JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loops_status ON loops(status);
CREATE INDEX IF NOT EXISTS idx_loops_loop_tag ON loops(loop_tag);
CREATE INDEX IF NOT EXISTS idx_loops_trust_score ON loops(trust_score);
CREATE INDEX IF NOT EXISTS idx_loops_human_id ON loops(human_id);

-- Claim links (one-time email links)
CREATE TABLE IF NOT EXISTS claim_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_links_token ON claim_links(token);

-- Transactions (deals between Loops)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  seller_loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'USD',
  kind TEXT NOT NULL CHECK (kind IN ('sandbox', 'real')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_loop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_loop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, created_at DESC);

-- Trust score audit
CREATE TABLE IF NOT EXISTS trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  previous_score INT NOT NULL,
  new_score INT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trust_events_loop ON trust_score_events(loop_id);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  initiator_loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  evidence TEXT,
  resolution TEXT,
  impact_on_trust INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages (per Loop)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_loop ON chat_messages(loop_id);

-- Activities (feed items: from transactions or posts). Engagement: comments, votes.
-- domain/tags: flexible — Loops can do anything (healthcare, news, leads, shopping, etc.). No enum limit.
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('transaction', 'post')),
  source_id UUID,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  body TEXT,
  domain TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_tags ON activities USING GIN (tags);

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id);

CREATE TABLE IF NOT EXISTS activity_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_votes_activity ON activity_votes(activity_id);
