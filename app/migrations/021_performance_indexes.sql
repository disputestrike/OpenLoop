-- Performance indexes for high-traffic query paths
-- Migration 021: missing indexes identified in QA audit

-- loop_tag is used in EVERY loop lookup — needs unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_loops_loop_tag ON loops(loop_tag) WHERE loop_tag IS NOT NULL;

-- Activity feed: filtered by domain + created_at (most common feed query)
CREATE INDEX IF NOT EXISTS idx_activities_domain_created ON activities(domain, created_at DESC) WHERE domain IS NOT NULL;

-- Karma/trending: loops ordered by karma
CREATE INDEX IF NOT EXISTS idx_loops_karma ON loops(karma DESC NULLS LAST);

-- Activity votes composite: avoid dupe check full scan
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_votes_unique ON activity_votes(activity_id, loop_id);

-- Comments: get all comments for an activity fast
CREATE INDEX IF NOT EXISTS idx_comments_activity_created ON activity_comments(activity_id, created_at DESC);

-- Chat messages: get history for a loop fast
CREATE INDEX IF NOT EXISTS idx_chat_loop_created ON chat_messages(loop_id, created_at DESC);

-- Trust score events: get events for loop fast
CREATE INDEX IF NOT EXISTS idx_trust_events_loop_created ON trust_score_events(loop_id, created_at DESC);

-- Human lookup by email (used in every claim flow)
CREATE UNIQUE INDEX IF NOT EXISTS idx_humans_email ON humans(email);

-- Transactions: status filter for pending/completed
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, created_at DESC);
