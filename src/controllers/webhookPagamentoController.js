import PaymentEventModel from '../models/paymentEventModel.js';
import { normalizeAsaasWebhookPayload } from '../services/asaasWebhookNormalizerService.js';

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

    const normalizedEvent = normalizeAsaasWebhookPayload(req.body || {});

    if (normalizedEvent.gatewayEventId) {
      const existingEvent = await PaymentEventModel.findByGatewayEventId(
        normalizedEvent.gatewayEventId,
        normalizedEvent.provider
      );

      if (existingEvent) {
        return res.status(200).json({
          received: true,
          duplicated: true,
          eventId: existingEvent.id
        });
      }
    }

    const event = await PaymentEventModel.create(normalizedEvent);

    return res.status(200).json({
      received: true,
      duplicated: false,
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