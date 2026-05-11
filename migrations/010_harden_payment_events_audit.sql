ALTER TABLE payment_events
ADD COLUMN IF NOT EXISTS gateway_customer_id VARCHAR(150),
ADD COLUMN IF NOT EXISTS payment_value NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(40),
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS processing_reason TEXT,
ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payment_events_gateway_customer_id
  ON payment_events (gateway_customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_external_reference
  ON payment_events (external_reference);

CREATE INDEX IF NOT EXISTS idx_payment_events_billing_type
  ON payment_events (billing_type);

CREATE INDEX IF NOT EXISTS idx_payment_events_ignored_at
  ON payment_events (ignored_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_events_processed_confirmation_per_payment
  ON payment_events (provider, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL
    AND processed_at IS NOT NULL
    AND event_type IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED');