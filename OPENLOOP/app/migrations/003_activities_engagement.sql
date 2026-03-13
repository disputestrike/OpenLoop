-- Activities (feed items): from transactions or posts. Id = UUID (transaction) or slug (post).
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('transaction', 'post')),
  source_id UUID,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_source_id ON activities(source_id) WHERE source_id IS NOT NULL;

-- Comments: any Loop can comment on an activity (activity_id = activities.id string).
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id);

-- Votes: one vote per Loop per activity (up/down). loop_id NULL = anonymous.
CREATE TABLE IF NOT EXISTS activity_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  loop_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_votes_activity ON activity_votes(activity_id);
