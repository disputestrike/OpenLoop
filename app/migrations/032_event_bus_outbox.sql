-- Event bus outbox: durable store when Redis is unavailable. Process outbox for async workers; later swap to Kafka.
-- See SCALE_AND_EVENTS.md for Kafka migration path.

CREATE TABLE IF NOT EXISTS event_bus_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_bus_outbox_topic ON event_bus_outbox(topic);
CREATE INDEX IF NOT EXISTS idx_event_bus_outbox_unconsumed ON event_bus_outbox(created_at) WHERE consumed_at IS NULL;

COMMENT ON TABLE event_bus_outbox IS 'Durable event outbox when Redis unavailable; process or forward to Kafka for scale.';
