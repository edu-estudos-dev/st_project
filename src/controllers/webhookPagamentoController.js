import PaymentEventModel from '../models/paymentEventModel.js';

function getHeaderValue(req, headerName) {
  return req.get(headerName) || req.headers[headerName.toLowerCase()] || null;
}

function isWebhookTokenValid(req) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error('ASAAS_WEBHOOK_TOKEN não configurado no ambiente.');
    return false;
  }

  const receivedToken = getHeaderValue(req, 'asaas-access-token');

  return receivedToken === expectedToken;
}

async function receberWebhookAsaas(req, res) {
  try {
    if (!isWebhookTokenValid(req)) {
      return res.status(401).json({
        received: false,
        message: 'Webhook não autorizado.'
      });
    }

    const payload = req.body || {};

    const eventType = payload.event || payload.eventType || 'UNKNOWN_EVENT';
    const gatewayEventId = payload.id || payload.eventId || null;
    const gatewayPaymentId = payload.payment?.id || payload.paymentId || null;
    const gatewaySubscriptionId =
      payload.subscription?.id || payload.subscriptionId || null;
    const status = payload.payment?.status || payload.status || null;

    const event = await PaymentEventModel.create({
      provider: 'asaas',
      eventType,
      gatewayEventId,
      gatewayPaymentId,
      gatewaySubscriptionId,
      status,
      payload
    });

    return res.status(200).json({
      received: true,
      eventId: event.id
    });
  } catch (error) {
    console.error('Erro ao receber webhook do Asaas:', error);

    return res.status(500).json({
      received: false,
      message: 'Erro ao processar webhook de pagamento.'
    });
  }
}

export {
  receberWebhookAsaas
};