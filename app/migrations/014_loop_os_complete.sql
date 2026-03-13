-- ═══════════════════════════════════════════════════════
-- MIGRATION 014: Loop Operating System — Complete Schema
-- Run this once. All tables are CREATE IF NOT EXISTS safe.
-- ═══════════════════════════════════════════════════════

-- ── Loop OS columns ─────────────────────────────────────
ALTER TABLE loops ADD COLUMN IF NOT EXISTS persona TEXT DEFAULT 'personal';
ALTER TABLE loops ADD COLUMN IF NOT EXISTS skill_tier INTEGER DEFAULT 0;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS spending_limit_cents INTEGER DEFAULT 0;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS onboarding_trust_bonus INTEGER DEFAULT 0;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT false;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS master_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS concurrent_limit INTEGER DEFAULT 500;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS business_tier TEXT DEFAULT 'starter';

-- ── Knowledge Base ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'onboarding', -- 'onboarding' | 'upload' | 'learned'
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Persistent Memory ────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- 'preference' | 'fact' | 'limit' | 'history'
  content TEXT NOT NULL,
  source TEXT DEFAULT 'chat',
  confirmed_by_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Permissions Log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  spending_limit_cents INTEGER DEFAULT 0,
  granted_by TEXT DEFAULT 'user',
  consent_text TEXT
);

-- ── Wallet ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_wallet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'savings' | 'deal' | 'tip' | 'fee' | 'withdrawal' | 'refund'
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER NOT NULL,
  description TEXT,
  verification_tier TEXT DEFAULT 'self_reported', -- 'self_reported' | 'evidence' | 'system'
  evidence_url TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Win Verifications ────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_saved_cents INTEGER DEFAULT 0,
  verification_tier TEXT DEFAULT 'self_reported',
  evidence_url TEXT,
  evidence_type TEXT, -- 'screenshot' | 'email' | 'receipt' | 'api'
  user_rating INTEGER, -- 1-5
  wallet_event_id UUID REFERENCES loop_wallet_events(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Ratings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loop_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  rated_by_loop_id UUID REFERENCES loops(id),
  interaction_type TEXT, -- 'chat' | 'deal' | 'contract' | 'win'
  reference_id UUID,
  score INTEGER NOT NULL CHECK (score IN (1, -1)), -- thumbs up = 1, down = -1
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Business Loop DAG Workers ────────────────────────────
CREATE TABLE IF NOT EXISTS loop_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  customer_identifier TEXT, -- phone, email, or session id
  status TEXT DEFAULT 'active', -- 'active' | 'idle' | 'closed'
  messages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- ── Notification Preferences ─────────────────────────────
CREATE TABLE IF NOT EXISTS loop_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'win' | 'deal' | 'message' | 'alert'
  channel TEXT NOT NULL, -- 'email' | 'sms' | 'app'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loop_knowledge_loop ON loop_knowledge(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_memory_loop ON loop_memory(loop_id);
CREATE INDEX IF NOT EXISTS idx_wallet_loop ON loop_wallet_events(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_wins_loop ON loop_wins(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_ratings_loop ON loop_ratings(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_threads_master ON loop_threads(master_loop_id);
CREATE INDEX IF NOT EXISTS idx_loops_phone ON loops(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loops_business ON loops(is_business) WHERE is_business = true;
CREATE INDEX IF NOT EXISTS idx_loops_master ON loops(master_loop_id) WHERE master_loop_id IS NOT NULL;
