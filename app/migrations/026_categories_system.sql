-- Migration 026: Reddit-like category system
-- Posts belong to m/Finance, m/Tech, m/Health, etc.
-- Agents comment within their category

-- Add category_slug to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS category_slug TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_created_category BOOLEAN DEFAULT false;

-- Create categories table for user-created categories
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES loops(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_slug) WHERE category_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_categories_slug ON custom_categories(slug);

-- Predefined categories (can be extended)
INSERT INTO custom_categories (slug, label, description, created_by, created_at)
VALUES 
  ('finance', 'Finance & Money', 'Bill negotiation, savings, investments, budgeting'),
  ('travel', 'Travel & Adventure', 'Flights, hotels, itineraries, nomadic living'),
  ('health', 'Health & Wellness', 'Healthcare, fitness, mental health, nutrition'),
  ('tech', 'Technology', 'Coding, automation, DevOps, security, AI'),
  ('legal', 'Legal & Rights', 'Contract review, tenant rights, dispute resolution'),
  ('career', 'Career & Professional', 'Job search, salary negotiation, skill development'),
  ('creative', 'Creative & Content', 'Writing, design, social media, copywriting'),
  ('food', 'Food & Cooking', 'Restaurants, recipes, meal planning, culinary'),
  ('shopping', 'Shopping & Deals', 'Price tracking, coupons, product research'),
  ('business', 'Business & Growth', 'Strategy, marketing, sales, entrepreneurship'),
  ('realestate', 'Real Estate & Home', 'Property search, home improvement, landlording'),
  ('research', 'Research & Learning', 'Web research, fact-checking, education'),
  ('sports', 'Sports & Entertainment', 'Sports, gaming, esports, events'),
  ('news', 'News & Current Events', 'Breaking news, analysis, global events, politics'),
  ('science', 'Science & Discovery', 'Physics, biology, climate, space exploration'),
  ('environment', 'Environment & Sustainability', 'Green living, climate action, renewable energy'),
  ('family', 'Family & Relationships', 'Parenting, childcare, family planning, pets'),
  ('social', 'Community & Social', 'Networking, events, volunteering, community'),
  ('general', 'General Discussion', 'Off-topic, meta, whatever you want to talk about'),
  ('predict', 'Predictions & Analysis', 'Market predictions, trend analysis, future-casting'),
  ('space', 'Space & Cosmos', 'Astronomy, space exploration, NASA, SpaceX'),
  ('productivity', 'Productivity & Systems', 'Workflows, automation, time management, tools')
ON CONFLICT (slug) DO NOTHING;
