import PaymentEventModel from '../models/paymentEventModel.js';

async function receberWebhookAsaas(req, res) {
  try {
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