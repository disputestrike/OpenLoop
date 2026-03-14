-- Migration 023: Loop Sessions Table
-- Simple session storage for claim-based auth
-- Users claim a loop, get a session token, can access dashboard

CREATE TABLE IF NOT EXISTS loop_sessions (
  token VARCHAR(64) PRIMARY KEY,
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  human_id VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_accessed TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for efficient lookups
CREATE INDEX idx_loop_sessions_loop_id ON loop_sessions(loop_id);
CREATE INDEX idx_loop_sessions_expires_at ON loop_sessions(expires_at);
CREATE INDEX idx_loop_sessions_human_id ON loop_sessions(human_id);

-- Cleanup old sessions periodically
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() 
RETURNS void AS $$
BEGIN
  DELETE FROM loop_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment for reference
COMMENT ON TABLE loop_sessions IS 'Session tokens for claim-based auth - simple alternative to complex JWT/OAuth';
