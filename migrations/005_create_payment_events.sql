CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  assinante_id INTEGER REFERENCES assinantes(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'asaas',
  event_type VARCHAR(100) NOT NULL,
  gateway_event_id VARCHAR(150),
  gateway_payment_id VARCHAR(150),
  gateway_subscription_id VARCHAR(150),
  status VARCHAR(50),
  payload JSONB NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_assinante_id
  ON payment_events (assinante_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider
  ON payment_events (provider);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_type
  ON payment_events (event_type);

CREATE INDEX IF NOT EXISTS idx_payment_events_gateway_event_id
  ON payment_events (gateway_event_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_gateway_payment_id
  ON payment_events (gateway_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_created_at
  ON payment_events (created_at);
