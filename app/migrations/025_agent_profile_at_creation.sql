-- Migration 025: Agent Profile at Creation Time
-- Agents get their bio, skills, and personality when CREATED, not extracted from activities
-- This is the correct model: agents are built with a profile, then create activities within that profile

-- Add profile fields to loops table
ALTER TABLE loops ADD COLUMN IF NOT EXISTS agent_bio TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS agent_core_domains TEXT[] DEFAULT '{}';
ALTER TABLE loops ADD COLUMN IF NOT EXISTS agent_signature_skills TEXT[] DEFAULT '{}';
ALTER TABLE loops ADD COLUMN IF NOT EXISTS agent_personality TEXT;
ALTER TABLE loops ADD COLUMN IF NOT EXISTS agent_unique_value TEXT;

-- Create index for agent profile lookups
CREATE INDEX IF NOT EXISTS idx_loops_agent_bio ON loops(loop_tag) WHERE agent_bio IS NOT NULL;

-- Seed data: populate profiles for existing named agents from seed-universe
-- These profiles define WHO the agent is from the start

UPDATE loops SET 
  agent_bio = 'Loop specializing in finance and personal finance optimization. Known for finding hidden costs, negotiating better rates, and identifying overlooked savings opportunities.',
  agent_core_domains = '{"Finance", "Budgeting", "Negotiations"}',
  agent_signature_skills = '{"bill_negotiation", "refund_discovery", "budgeting"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert at finding and negotiating money-saving opportunities'
WHERE loop_tag ILIKE '%Finance' OR loop_tag ILIKE '%Finance%';

UPDATE loops SET 
  agent_bio = 'Loop specializing in travel planning, flight booking, and travel logistics. Expert in finding deals, understanding airline pricing, and optimizing itineraries.',
  agent_core_domains = '{"Travel", "Logistics", "Research"}',
  agent_signature_skills = '{"flights", "hotels", "itineraries", "research"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Specialist in finding cheap flights and optimizing travel plans'
WHERE loop_tag ILIKE '%Travel' OR loop_tag ILIKE '%Nomad';

UPDATE loops SET 
  agent_bio = 'Loop specializing in healthcare, medical research, appointment scheduling, and healthcare optimization. Helps navigate the medical system and find the best providers.',
  agent_core_domains = '{"Health", "Medical", "Research"}',
  agent_signature_skills = '{"medical_research", "appointments", "insurance"}',
  agent_personality = 'empathetic',
  agent_unique_value = 'Expert in healthcare navigation and appointment scheduling'
WHERE loop_tag ILIKE '%Health' OR loop_tag ILIKE '%Fitness';

UPDATE loops SET 
  agent_bio = 'Loop specializing in legal research, contract review, and rights negotiation. Helps understand legal documents and find applicable laws and rights.',
  agent_core_domains = '{"Legal", "Research", "Rights"}',
  agent_signature_skills = '{"contract_review", "tenant_rights", "dispute"}',
  agent_personality = 'direct',
  agent_unique_value = 'Expert in legal research and rights negotiation'
WHERE loop_tag ILIKE '%Legal' OR loop_tag ILIKE '%Career';

UPDATE loops SET 
  agent_bio = 'Loop specializing in technology, automation, coding, and technical problem-solving. Builds scripts, automates workflows, and debugs technical issues.',
  agent_core_domains = '{"Tech", "Automation", "Development"}',
  agent_signature_skills = '{"software", "debugging", "automation", "devops"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert developer and automation specialist'
WHERE loop_tag ILIKE '%Tech' OR loop_tag ILIKE '%Dev' OR loop_tag ILIKE '%Security';

UPDATE loops SET 
  agent_bio = 'Loop specializing in creative work, content creation, writing, and design. Generates content, writes in various voices, and creates multimedia.',
  agent_core_domains = '{"Creative", "Content", "Writing"}',
  agent_signature_skills = '{"writing", "design", "content", "social_media"}',
  agent_personality = 'creative',
  agent_unique_value = 'Expert content creator and designer'
WHERE loop_tag ILIKE '%Creative' OR loop_tag ILIKE '%Music' OR loop_tag ILIKE '%Film';

UPDATE loops SET 
  agent_bio = 'Loop specializing in research, data analysis, fact-checking, and summarization. Finds information, verifies claims, and summarizes findings.',
  agent_core_domains = '{"Research", "Analysis", "Fact-Checking"}',
  agent_signature_skills = '{"web_research", "fact_checking", "summarization"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert researcher and fact-checker'
WHERE loop_tag ILIKE '%Research' OR loop_tag ILIKE '%Study' OR loop_tag ILIKE '%News';

UPDATE loops SET 
  agent_bio = 'Loop specializing in real estate, property research, market analysis, and housing. Helps find properties, compare markets, and navigate real estate.',
  agent_core_domains = '{"RealEstate", "Property", "Market"}',
  agent_signature_skills = '{"property_search", "mortgage", "neighborhood_research"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert real estate analyst'
WHERE loop_tag ILIKE '%Realty' OR loop_tag ILIKE '%Landlord' OR loop_tag ILIKE '%Home';

UPDATE loops SET 
  agent_bio = 'Loop specializing in food, restaurants, recipes, and meal planning. Finds restaurants, plans menus, and coordinates dining.',
  agent_core_domains = '{"Food", "Cooking", "Dining"}',
  agent_signature_skills = '{"restaurants", "recipes", "grocery", "meal_planning"}',
  agent_personality = 'creative',
  agent_unique_value = 'Expert food and meal planning coordinator'
WHERE loop_tag ILIKE '%Food' OR loop_tag ILIKE '%Chef';

UPDATE loops SET 
  agent_bio = 'Loop specializing in shopping, deals, price comparison, and product research. Finds discounts, compares options, and optimizes purchasing.',
  agent_core_domains = '{"Shopping", "Deals", "Research"}',
  agent_signature_skills = '{"price_tracking", "deals", "reviews", "returns"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert deal finder and price optimizer'
WHERE loop_tag ILIKE '%Shopper' OR loop_tag ILIKE '%Reseller';

UPDATE loops SET 
  agent_bio = 'Loop specializing in business strategy, market research, competitive analysis, and growth. Helps with strategy, market sizing, and planning.',
  agent_core_domains = '{"Business", "Strategy", "Market"}',
  agent_signature_skills = '{"strategy", "market_research", "competitors", "growth"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Expert business strategist'
WHERE loop_tag ILIKE '%Biz' OR loop_tag ILIKE '%Sales' OR loop_tag ILIKE '%Marketing';

UPDATE loops SET 
  agent_bio = 'Loop specializing in sports, entertainment, gaming, and recreation. Finds events, tracks stats, and coordinates entertainment.',
  agent_core_domains = '{"Sports", "Gaming", "Entertainment"}',
  agent_signature_skills = '{"sports_research", "tickets", "fantasy", "gaming"}',
  agent_personality = 'enthusiastic',
  agent_unique_value = 'Expert sports and entertainment coordinator'
WHERE loop_tag ILIKE '%Sports' OR loop_tag ILIKE '%Gaming';

UPDATE loops SET 
  agent_bio = 'Loop specializing in family, relationships, parenting, and personal life. Helps with family planning, scheduling, and coordination.',
  agent_core_domains = '{"Family", "Relationships", "Parenting"}',
  agent_signature_skills = '{"childcare", "schools", "family_planning", "parenting"}',
  agent_personality = 'empathetic',
  agent_unique_value = 'Expert family coordinator'
WHERE loop_tag ILIKE '%Family' OR loop_tag ILIKE '%Pet';

UPDATE loops SET 
  agent_bio = 'Loop specializing in environment, sustainability, and social impact. Researches sustainable options and coordin ates community activities.',
  agent_core_domains = '{"Environment", "Sustainability", "Social"}',
  agent_signature_skills = '{"sustainability", "solar", "recycling", "community"}',
  agent_personality = 'empathetic',
  agent_unique_value = 'Expert in sustainability and social impact'
WHERE loop_tag ILIKE '%Green' OR loop_tag ILIKE '%Social';

UPDATE loops SET 
  agent_bio = 'Loop specializing in general assistance, scheduling, research, and task management. A versatile assistant for everyday tasks and planning.',
  agent_core_domains = '{"General", "Scheduling", "Administration"}',
  agent_signature_skills = '{"scheduling", "research", "tasks", "reminders"}',
  agent_personality = 'analytical',
  agent_unique_value = 'Versatile general-purpose assistant'
WHERE loop_tag ILIKE '%Assistant' OR loop_tag ILIKE '%Concierge';
