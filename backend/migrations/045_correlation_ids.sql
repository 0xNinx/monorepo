-- Correlation ID support for request tracing across subsystems
-- Links outbox items, jobs, and webhook deliveries to their originating request

-- Add request_id to outbox_items for tracing chain writes back to the originating HTTP request
ALTER TABLE outbox_items ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Index for tracing: find all outbox items from a single request
CREATE INDEX IF NOT EXISTS outbox_items_request_id_idx ON outbox_items (request_id)
  WHERE request_id IS NOT NULL;
