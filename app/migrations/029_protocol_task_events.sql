-- Protocol runtime: verifiable task ledger for Universal Agent Protocol
-- Every protocol message is recorded for audit, trust, and lifecycle.

CREATE TABLE IF NOT EXISTS protocol_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- TASK_REQUEST, TASK_OFFER, COUNTER_OFFER, TASK_ACCEPT, TASK_EXECUTE, TASK_COMPLETE, PAYMENT_REQUEST, PAYMENT_CONFIRM
  from_agent_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES loops(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES loop_contracts(id) ON DELETE SET NULL,
  correlation_id TEXT, -- links request → offer → accept → complete
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_protocol_task_events_type ON protocol_task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_protocol_task_events_from ON protocol_task_events(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_protocol_task_events_to ON protocol_task_events(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_protocol_task_events_contract ON protocol_task_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_protocol_task_events_correlation ON protocol_task_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_protocol_task_events_created ON protocol_task_events(created_at DESC);
