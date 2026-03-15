# Scale & Event Bus

## Current behavior

- **Redis available:** `publishEvent(type, data)` publishes to Redis Pub/Sub. Workers can `subscribeToEvent(type, callback)`.
- **Redis not available:** Events are written to **`event_bus_outbox`** (topic, payload, created_at). No subscribers run; events are durable for later processing.

## Scaling to millions of events

1. **Process the outbox:** Run a worker that:
   - `SELECT * FROM event_bus_outbox WHERE consumed_at IS NULL ORDER BY created_at LIMIT N`
   - For each row: publish to Redis (or Kafka), then `UPDATE event_bus_outbox SET consumed_at = now() WHERE id = $1`
2. **Or forward to Kafka:** Same worker, but instead of Redis publish, produce to a Kafka topic. Consumers replace Redis subscribers.
3. **Optionally:** Change `publishEvent()` to write only to the outbox and have a single worker drain to Redis/Kafka so all producers are non-blocking.

## Tables

- **event_bus_outbox** — id, topic, payload (JSONB), created_at, consumed_at. Index on (topic), (created_at) WHERE consumed_at IS NULL.
