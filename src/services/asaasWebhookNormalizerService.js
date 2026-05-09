const PAYMENT_CONFIRMED_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED'
]);

const PAYMENT_CONFIRMED_STATUSES = new Set([
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH'
]);

const PAYMENT_OVERDUE_EVENTS = new Set([
  'PAYMENT_OVERDUE'
]);

const PAYMENT_OVERDUE_STATUSES = new Set([
  'OVERDUE'
]);

const PAYMENT_DELETED_EVENTS = new Set([
  'PAYMENT_DELETED'
]);

const SUBSCRIPTION_CANCELLED_EVENTS = new Set([
  'SUBSCRIPTION_DELETED',
  'SUBSCRIPTION_INACTIVATED'
]);

const SUBSCRIPTION_CANCELLED_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'INACTIVE',
  'INACTIVATED'
]);

function normalizeUpper(value, fallback = null) {
  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase();

  return normalizedValue || fallback;
}

function normalizeAsaasWebhookPayload(payload = {}) {
  const payment = payload.payment || {};
  const subscription = payload.subscription || {};

  const eventType = normalizeUpper(
    payload.event || payload.eventType,
    'UNKNOWN_EVENT'
  );

  const status = normalizeUpper(
    payment.status || subscription.status || payload.status,
    null
  );

  const isPaymentConfirmed =
    PAYMENT_CONFIRMED_EVENTS.has(eventType)
    || PAYMENT_CONFIRMED_STATUSES.has(status);

  const isPaymentOverdue =
    PAYMENT_OVERDUE_EVENTS.has(eventType)
    || PAYMENT_OVERDUE_STATUSES.has(status);

  const isPaymentDeleted =
    PAYMENT_DELETED_EVENTS.has(eventType);

  const isSubscriptionCancelled =
    SUBSCRIPTION_CANCELLED_EVENTS.has(eventType)
    || SUBSCRIPTION_CANCELLED_STATUSES.has(status);

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
    dueDate:
      payment.dueDate
      || subscription.nextDueDate
      || payload.dueDate
      || null,
    isPaymentConfirmed,
    isPaymentOverdue,
    isPaymentDeleted,
    isSubscriptionCancelled,
    payload
  };
}

export {
  normalizeAsaasWebhookPayload
};