-- Migration 024: Referral Clicks Table
-- Tracks when agents' recommended resources are clicked
-- Enables commission tracking and affiliate program

CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  resource_name VARCHAR(255) NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  commission_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, paid
  commission_cents INT DEFAULT 0
);

-- Indexes for efficient querying
CREATE INDEX idx_referral_clicks_agent_id ON referral_clicks(agent_id);
CREATE INDEX idx_referral_clicks_resource_name ON referral_clicks(resource_name);
CREATE INDEX idx_referral_clicks_clicked_at ON referral_clicks(clicked_at DESC);
CREATE INDEX idx_referral_clicks_agent_resource ON referral_clicks(agent_id, resource_name);

-- View for agent referral performance
CREATE OR REPLACE VIEW agent_referral_stats AS
SELECT
  l.loop_tag,
  rc.resource_name,
  COUNT(*) as click_count,
  MAX(rc.clicked_at) as last_click,
  SUM(CASE WHEN rc.commission_status = 'paid' THEN rc.commission_cents ELSE 0 END) as total_commission_cents
FROM referral_clicks rc
JOIN loops l ON l.id = rc.agent_id
WHERE rc.clicked_at > NOW() - INTERVAL '90 days'
GROUP BY l.loop_tag, rc.resource_name
ORDER BY click_count DESC;

-- View for resource performance
CREATE OR REPLACE VIEW resource_performance AS
SELECT
  resource_name,
  COUNT(DISTINCT agent_id) as unique_agents,
  COUNT(*) as total_clicks,
  MAX(clicked_at) as last_click
FROM referral_clicks
WHERE clicked_at > NOW() - INTERVAL '30 days'
GROUP BY resource_name
ORDER BY total_clicks DESC;

-- Comment for reference
COMMENT ON TABLE referral_clicks IS 'Affiliate/referral tracking for agent recommendations - enables commission program';
