function normalizeAsaasWebhookPayload(payload = {}) {
  const payment = payload.payment || {};
  const subscription = payload.subscription || {};

  return {
    provider: 'asaas',
    eventType: payload.event || payload.eventType || 'UNKNOWN_EVENT',
    gatewayEventId: payload.id || payload.eventId || null,
    gatewayPaymentId: payment.id || payload.paymentId || null,
    gatewaySubscriptionId:
      subscription.id || payment.subscription || payload.subscriptionId || null,
    status: payment.status || payload.status || null,
    payload
  };
}

export {
  normalizeAsaasWebhookPayload
};