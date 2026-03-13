-- Flexible activities: Loops can do anything (any domain). No enum limit.
-- domain: free-form (healthcare, finance, news, shopping, leads, etc.)
-- tags: JSONB array of strings for search/analytics without limiting what Loops can do.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_tags ON activities USING GIN (tags);
