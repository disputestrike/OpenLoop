/**
 * PHASE 3: DATABASE MIGRATIONS
 * Creates all tables needed for verification and dispute systems
 * 
 * Run: psql $DATABASE_URL < phase3-migrations.sql
 * Or: bash scripts/run-migrations.sh
 */

-- ============================================================================
-- PHASE 3: ESCROW TABLE (holds funds during transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'held',
  held_at TIMESTAMP NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP,
  refunded_at TIMESTAMP,
  dispute_id UUID
);

CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transaction_id ON escrow(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer_id ON escrow(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller_id ON escrow(seller_id);

-- ============================================================================
-- PHASE 3: DISPUTES TABLE (tracks disagreements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolution VARCHAR(20),
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer_id ON disputes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller_id ON disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);

-- ============================================================================
-- PHASE 3: AGENT VERIFICATIONS TABLE (skills verified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL,
  verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  verified_by VARCHAR(50) NOT NULL,
  evidence TEXT,
  UNIQUE(loop_id, skill)
);

CREATE INDEX IF NOT EXISTS idx_agent_verifications_loop_id ON agent_verifications(loop_id);
CREATE INDEX IF NOT EXISTS idx_agent_verifications_skill ON agent_verifications(skill);
CREATE INDEX IF NOT EXISTS idx_agent_verifications_verified_at ON agent_verifications(verified_at DESC);

-- ============================================================================
-- PHASE 3: AGENT BADGES TABLE (earned achievements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  level INT DEFAULT 1,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(loop_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_badges_loop_id ON agent_badges(loop_id);
CREATE INDEX IF NOT EXISTS idx_agent_badges_type ON agent_badges(badge_type);

-- ============================================================================
-- PHASE 3: VERIFICATION APPLICATIONS TABLE (pending approvals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  skill VARCHAR(50) NOT NULL,
  evidence TEXT NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_verification_applications_loop_id ON verification_applications(loop_id);
CREATE INDEX IF NOT EXISTS idx_verification_applications_status ON verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_verification_applications_applied_at ON verification_applications(applied_at DESC);

-- ============================================================================
-- PHASE 3: FINAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_activities_loop_id ON activities(loop_id);
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_kind ON activities(kind);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_loop_id ON activity_comments(loop_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_activity_votes_activity_id ON activity_votes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_votes_loop_id ON activity_votes(loop_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_loop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);

-- Loops indexes
CREATE INDEX IF NOT EXISTS idx_loops_status ON loops(status);
CREATE INDEX IF NOT EXISTS idx_loops_trust_score ON loops(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_loops_created_at ON loops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loops_loop_tag ON loops(loop_tag);
CREATE INDEX IF NOT EXISTS idx_loops_business_category ON loops(business_category);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_loop_id ON loop_wallet_events(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_kind ON loop_wallet_events(kind);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_created_at ON loop_wallet_events(created_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_loop_id ON reviews(loop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_loop_follows_following_loop_id ON loop_follows(following_loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_follows_follower_loop_id ON loop_follows(follower_loop_id);

-- ============================================================================
-- VACUUM & ANALYZE
-- ============================================================================

VACUUM ANALYZE escrow;
VACUUM ANALYZE disputes;
VACUUM ANALYZE agent_verifications;
VACUUM ANALYZE agent_badges;
VACUUM ANALYZE verification_applications;
VACUUM ANALYZE activities;
VACUUM ANALYZE activity_comments;
VACUUM ANALYZE transactions;
VACUUM ANALYZE loops;
VACUUM ANALYZE loop_wallet_events;
VACUUM ANALYZE reviews;
VACUUM ANALYZE loop_follows;
