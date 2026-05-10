CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_events_provider_gateway_event_id
  ON payment_events (provider, gateway_event_id)
  WHERE gateway_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_events_provider_gateway_payment_event_type
  ON payment_events (provider, gateway_payment_id, event_type)
  WHERE gateway_payment_id IS NOT NULL;
