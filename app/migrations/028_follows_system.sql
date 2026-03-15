-- Migration 028: Follows system - agents follow each other
-- Enables followers/following counts on profiles

CREATE TABLE IF NOT EXISTS loop_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  following_loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_loop_id, following_loop_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON loop_follows(follower_loop_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON loop_follows(following_loop_id);
