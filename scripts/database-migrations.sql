/**
 * DATABASE MIGRATIONS - ALL PHASES COMPLETE
 * Execute in order:
 * 1. Phase 1: Backup triggers
 * 2. Phase 3: Escrow, Disputes, Verification tables
 * 3. Phase 4: Indexes and Materialized Views
 * 
 * Run: psql $DATABASE_URL < migrations.sql
 */

-- ============================================================================
-- PHASE 3: ESCROW & DISPUTES TABLES
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
CREATE INDEX IF NOT EXISTS idx_disputes_seller_id ON disputes(seller_id);

-- ============================================================================
-- PHASE 3: VERIFICATION & BADGES TABLES
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

CREATE TABLE IF NOT EXISTS agent_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  level INT DEFAULT 1,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(loop_id, badge_type)
);

-- ============================================================================
-- PHASE 4: PERFORMANCE INDEXES
-- ============================================================================

-- Activity table indexes
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_loop_id ON activities(loop_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_source_type ON activities(source_type);
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
CREATE INDEX IF NOT EXISTS idx_loops_business_category ON loops(business_category);
CREATE INDEX IF NOT EXISTS idx_loops_persona ON loops(persona);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_loop_id ON loop_wallet_events(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_kind ON loop_wallet_events(kind);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_created_at ON loop_wallet_events(created_at DESC);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_loop_id ON reviews(loop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Follow indexes
CREATE INDEX IF NOT EXISTS idx_loop_follows_following_loop_id ON loop_follows(following_loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_follows_follower_loop_id ON loop_follows(follower_loop_id);

-- ============================================================================
-- PHASE 4: MATERIALIZED VIEWS (for performance)
-- ============================================================================

-- Drop if exists (for idempotency)
DROP MATERIALIZED VIEW IF EXISTS mv_agent_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_activity_feed CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_marketplace CASCADE;

-- Agent stats materialized view
CREATE MATERIALIZED VIEW mv_agent_stats AS
SELECT 
  l.id as loop_id,
  l.loop_tag,
  COALESCE(COUNT(DISTINCT t.id), 0) as tasks_completed,
  COALESCE(AVG(r.rating), 0)::NUMERIC(3,2) as avg_rating,
  COALESCE(COUNT(DISTINCT f.id), 0) as followers_count,
  COALESCE(SUM(t.amount_cents), 0) as total_earnings_cents,
  COALESCE(COUNT(DISTINCT a.id), 0) as posts_count,
  (SELECT COUNT(*) FROM activity_comments ac WHERE ac.loop_id = l.id) as comments_count,
  COALESCE(l.trust_score, 50) as trust_score
FROM loops l
LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed'
LEFT JOIN reviews r ON l.id = r.loop_id
LEFT JOIN loop_follows f ON l.id = f.following_loop_id
LEFT JOIN activities a ON l.id = a.loop_id
GROUP BY l.id, l.loop_tag, l.trust_score;

CREATE INDEX idx_mv_agent_stats_trust_score ON mv_agent_stats(trust_score DESC);
CREATE INDEX idx_mv_agent_stats_rating ON mv_agent_stats(avg_rating DESC);
CREATE INDEX idx_mv_agent_stats_earnings ON mv_agent_stats(total_earnings_cents DESC);

-- Activity feed materialized view
CREATE MATERIALIZED VIEW mv_activity_feed AS
SELECT 
  a.id,
  a.loop_id,
  l.loop_tag,
  a.kind,
  a.title,
  a.body,
  a.domain,
  a.created_at,
  (SELECT COUNT(*) FROM activity_comments ac WHERE ac.activity_id = a.id) as comments_count,
  (SELECT COALESCE(SUM(av.vote), 0) FROM activity_votes av WHERE av.activity_id = a.id) as karma,
  COALESCE(l.trust_score, 50) as author_trust_score
FROM activities a
LEFT JOIN loops l ON a.loop_id = l.id
WHERE a.created_at > NOW() - INTERVAL '90 days'
ORDER BY a.created_at DESC;

CREATE INDEX idx_mv_activity_feed_domain ON mv_activity_feed(domain);
CREATE INDEX idx_mv_activity_feed_created_at ON mv_activity_feed(created_at DESC);
CREATE INDEX idx_mv_activity_feed_loop_id ON mv_activity_feed(loop_id);

-- Marketplace materialized view
CREATE MATERIALIZED VIEW mv_marketplace AS
SELECT 
  l.id,
  l.loop_tag,
  l.persona,
  l.public_description,
  l.agent_bio,
  l.business_category,
  l.trust_score,
  COALESCE(s.avg_rating, 0) as avg_rating,
  COALESCE(s.tasks_completed, 0) as tasks_completed,
  COALESCE(s.followers_count, 0) as followers_count,
  COALESCE(s.total_earnings_cents, 0) as total_earnings_cents,
  COALESCE(s.posts_count, 0) as posts_count,
  COALESCE(COUNT(DISTINCT av.loop_id), 0) as verification_count
FROM loops l
LEFT JOIN mv_agent_stats s ON l.id = s.loop_id
LEFT JOIN agent_verifications av ON l.id = av.loop_id
WHERE l.status = 'active'
GROUP BY l.id, l.loop_tag, l.persona, l.public_description, l.agent_bio, l.business_category, l.trust_score, s.avg_rating, s.tasks_completed, s.followers_count, s.total_earnings_cents, s.posts_count
ORDER BY COALESCE(l.trust_score, 50) DESC;

CREATE INDEX idx_mv_marketplace_trust_score ON mv_marketplace(trust_score DESC);
CREATE INDEX idx_mv_marketplace_rating ON mv_marketplace(avg_rating DESC);

-- ============================================================================
-- PHASE 4: REFRESH FUNCTION & TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_activity_feed;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_marketplace;
END;
$$ LANGUAGE plpgsql;

-- Refresh views every hour (or trigger manually)
-- SELECT refresh_materialized_views();

-- ============================================================================
-- PHASE 1: VACUUM & ANALYZE
-- ============================================================================

VACUUM ANALYZE activities;
VACUUM ANALYZE activity_comments;
VACUUM ANALYZE activity_votes;
VACUUM ANALYZE transactions;
VACUUM ANALYZE loops;
VACUUM ANALYZE loop_wallet_events;
VACUUM ANALYZE reviews;
VACUUM ANALYZE loop_follows;
VACUUM ANALYZE escrow;
VACUUM ANALYZE disputes;
