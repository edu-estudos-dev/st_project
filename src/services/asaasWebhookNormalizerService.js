const PAYMENT_CONFIRMED_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_APPROVED'
]);

const PAYMENT_CONFIRMED_STATUSES = new Set([
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH'
]);

function normalizeAsaasWebhookPayload(payload = {}) {
  const payment = payload.payment || {};
  const subscription = payload.subscription || {};
  const eventType = payload.event || payload.eventType || 'UNKNOWN_EVENT';
  const status = payment.status || payload.status || null;

  return {
    provider: 'asaas',
    eventType,
    gatewayEventId: payload.id || payload.eventId || null,
    gatewayPaymentId: payment.id || payload.paymentId || null,
    gatewayCustomerId:
      payment.customer || subscription.customer || payload.customer || null,
    gatewaySubscriptionId:
      subscription.id || payment.subscription || payload.subscriptionId || null,
    status,
    paymentDate:
      payment.paymentDate
      || payment.clientPaymentDate
      || payment.confirmedDate
      || payment.dateCreated
      || payload.paymentDate
      || null,
    dueDate: payment.dueDate || payload.dueDate || null,
    isPaymentConfirmed:
      PAYMENT_CONFIRMED_EVENTS.has(eventType)
      || PAYMENT_CONFIRMED_STATUSES.has(status),
    payload
  };
}

export {
  normalizeAsaasWebhookPayload
};