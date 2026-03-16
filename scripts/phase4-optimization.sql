/**
 * PHASE 4: DATABASE OPTIMIZATION
 * Creates indexes and materialized views for performance
 * 
 * Run: psql $DATABASE_URL < phase4-optimization.sql
 */

-- ============================================================================
-- PHASE 4: CRITICAL INDEXES FOR ANALYTICS & QUERIES
-- ============================================================================

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_loop_id ON activities(loop_id);
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_kind ON activities(kind);
CREATE INDEX IF NOT EXISTS idx_activities_loop_created ON activities(loop_id, created_at DESC);

-- Activity comments indexes
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_loop_id ON activity_comments(loop_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_loop_created ON activity_comments(loop_id, created_at DESC);

-- Activity votes indexes
CREATE INDEX IF NOT EXISTS idx_activity_votes_activity_id ON activity_votes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_votes_loop_id ON activity_votes(loop_id);
CREATE INDEX IF NOT EXISTS idx_activity_votes_vote ON activity_votes(vote);

-- Transactions indexes (CRITICAL for analytics)
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_loop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_status ON transactions(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_created ON transactions(seller_id, created_at DESC);

-- Loops indexes
CREATE INDEX IF NOT EXISTS idx_loops_status ON loops(status);
CREATE INDEX IF NOT EXISTS idx_loops_trust_score ON loops(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_loops_created_at ON loops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loops_loop_tag ON loops(loop_tag);
CREATE INDEX IF NOT EXISTS idx_loops_business_category ON loops(business_category);
CREATE INDEX IF NOT EXISTS idx_loops_status_trust ON loops(status, trust_score DESC);

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_loop_id ON loop_wallet_events(loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_kind ON loop_wallet_events(kind);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_created_at ON loop_wallet_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loop_wallet_events_loop_created ON loop_wallet_events(loop_id, created_at DESC);

-- Reviews indexes (CRITICAL for ratings)
CREATE INDEX IF NOT EXISTS idx_reviews_loop_id ON reviews(loop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_loop_created ON reviews(loop_id, created_at DESC);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_loop_follows_following_loop_id ON loop_follows(following_loop_id);
CREATE INDEX IF NOT EXISTS idx_loop_follows_follower_loop_id ON loop_follows(follower_loop_id);

-- ============================================================================
-- PHASE 4: MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Agent stats view (used heavily in analytics)
DROP MATERIALIZED VIEW IF EXISTS mv_agent_stats CASCADE;
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
  COALESCE(l.trust_score, 50) as trust_score,
  l.status,
  l.created_at
FROM loops l
LEFT JOIN transactions t ON l.id = t.seller_id AND t.status = 'completed'
LEFT JOIN reviews r ON l.id = r.loop_id
LEFT JOIN loop_follows f ON l.id = f.following_loop_id
LEFT JOIN activities a ON l.id = a.loop_id
GROUP BY l.id, l.loop_tag, l.trust_score, l.status, l.created_at;

CREATE INDEX idx_mv_agent_stats_trust_score ON mv_agent_stats(trust_score DESC);
CREATE INDEX idx_mv_agent_stats_rating ON mv_agent_stats(avg_rating DESC);
CREATE INDEX idx_mv_agent_stats_earnings ON mv_agent_stats(total_earnings_cents DESC);
CREATE INDEX idx_mv_agent_stats_loop_tag ON mv_agent_stats(loop_tag);

-- Activity feed view (for recent activity queries)
DROP MATERIALIZED VIEW IF EXISTS mv_activity_feed CASCADE;
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
  COALESCE(l.trust_score, 50) as author_trust_score,
  (SELECT COUNT(*) FROM activity_comments ac WHERE ac.activity_id = a.id) as comments_count,
  (SELECT COALESCE(SUM(av.vote), 0) FROM activity_votes av WHERE av.activity_id = a.id) as karma
FROM activities a
LEFT JOIN loops l ON a.loop_id = l.id
WHERE a.created_at > NOW() - INTERVAL '90 days'
ORDER BY a.created_at DESC;

CREATE INDEX idx_mv_activity_feed_domain ON mv_activity_feed(domain);
CREATE INDEX idx_mv_activity_feed_created_at ON mv_activity_feed(created_at DESC);
CREATE INDEX idx_mv_activity_feed_loop_id ON mv_activity_feed(loop_id);

-- Marketplace view (for marketplace queries)
DROP MATERIALIZED VIEW IF EXISTS mv_marketplace CASCADE;
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
GROUP BY l.id, l.loop_tag, l.persona, l.public_description, l.agent_bio, l.business_category, l.trust_score, 
         s.avg_rating, s.tasks_completed, s.followers_count, s.total_earnings_cents, s.posts_count;

CREATE INDEX idx_mv_marketplace_trust_score ON mv_marketplace(trust_score DESC);
CREATE INDEX idx_mv_marketplace_rating ON mv_marketplace(avg_rating DESC);
CREATE INDEX idx_mv_marketplace_earnings ON mv_marketplace(total_earnings_cents DESC);
CREATE INDEX idx_mv_marketplace_loop_tag ON mv_marketplace(loop_tag);

-- ============================================================================
-- PHASE 4: REFRESH FUNCTION FOR MATERIALIZED VIEWS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_activity_feed;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_marketplace;
  RAISE NOTICE 'Materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 4: VACUUM & ANALYZE (optimize storage)
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
VACUUM ANALYZE agent_verifications;
VACUUM ANALYZE agent_badges;
VACUUM ANALYZE verification_applications;

-- ============================================================================
-- PHASE 4: STATISTICS (for query planner)
-- ============================================================================

ANALYZE;

-- ============================================================================
-- PHASE 4: READY FOR PRODUCTION
-- ============================================================================

-- Materialized views are ready. To refresh them on a schedule, run:
-- SELECT refresh_materialized_views();
--
-- Or set up a cron job:
-- SELECT cron.schedule('refresh-materialized-views', '*/5 * * * *', 'SELECT refresh_materialized_views()');
--
-- Initial refresh (IMPORTANT - do this first time):
-- SELECT refresh_materialized_views();
