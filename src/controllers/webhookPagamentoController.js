import AssinanteModel from '../models/assinanteModel.js';
import PaymentEventModel from '../models/paymentEventModel.js';
import { normalizeAsaasWebhookPayload } from '../services/asaasWebhookNormalizerService.js';

function getHeaderValue(req, headerName) {
  return req.get(headerName) || req.headers[headerName.toLowerCase()] || null;
}

function isWebhookTokenValid(req) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error('Token do webhook de pagamento não configurado no ambiente.');
    return false;
  }

  const receivedToken = getHeaderValue(req, 'asaas-access-token');

  return receivedToken === expectedToken;
}

async function resolveAssinanteFromEvent(normalizedEvent) {
  return AssinanteModel.findByGatewayReference({
    gatewayCustomerId: normalizedEvent.gatewayCustomerId,
    gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
  });
}

async function processPaymentEvent(normalizedEvent, assinante) {
  if (!assinante?.id) {
    return {
      processed: false,
      reason: 'assinante_not_found'
    };
  }

  if (normalizedEvent.isPaymentConfirmed) {
    const updatedAssinante = await AssinanteModel.activateAfterConfirmedPayment(
      assinante.id,
      {
        paymentDate: normalizedEvent.paymentDate,
        gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
      }
    );

    return {
      processed: true,
      reason: 'subscription_activated',
      assinante: updatedAssinante
    };
  }

  if (normalizedEvent.isSubscriptionCancelled) {
    const updatedAssinante = await AssinanteModel.cancelFromGateway(
      assinante.id,
      {
        gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
      }
    );

    return {
      processed: true,
      reason: 'subscription_cancelled',
      assinante: updatedAssinante
    };
  }

  if (normalizedEvent.isPaymentOverdue) {
    const updatedAssinante = await AssinanteModel.markAsOverdueFromPayment(
      assinante.id,
      {
        dueDate: normalizedEvent.dueDate,
        gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
      }
    );

    return {
      processed: Boolean(updatedAssinante),
      reason: updatedAssinante
        ? 'subscription_marked_overdue'
        : 'subscription_not_changed',
      assinante: updatedAssinante
    };
  }

  if (normalizedEvent.isPaymentDeleted) {
    const updatedAssinante = await AssinanteModel.markAsOverdueFromPayment(
      assinante.id,
      {
        dueDate: normalizedEvent.dueDate,
        gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
      }
    );

    return {
      processed: Boolean(updatedAssinante),
      reason: updatedAssinante
        ? 'payment_deleted_subscription_marked_overdue'
        : 'subscription_not_changed',
      assinante: updatedAssinante
    };
  }

  return {
    processed: false,
    reason: 'event_not_actionable'
  };
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
    const existingEvent = await PaymentEventModel.findDuplicate(normalizedEvent);

    if (existingEvent) {
      return res.status(200).json({
        received: true,
        duplicated: true,
        eventId: existingEvent.id
      });
    }

    const assinante = await resolveAssinanteFromEvent(normalizedEvent);

    const event = await PaymentEventModel.create({
      ...normalizedEvent,
      assinanteId: assinante?.id || null
    });

    const processingResult = await processPaymentEvent(normalizedEvent, assinante);

    if (processingResult.processed) {
      await PaymentEventModel.markAsProcessed(event.id);
    }

    return res.status(200).json({
      received: true,
      duplicated: false,
      eventId: event.id,
      eventType: normalizedEvent.eventType,
      status: normalizedEvent.status,
      assinanteId: assinante?.id || null,
      processed: processingResult.processed,
      processingReason: processingResult.reason
    });
  } catch (error) {
    console.error('Erro ao receber webhook de pagamento:', error);

    return res.status(500).json({
      received: false,
      message: 'Erro ao processar webhook de pagamento.'
    });
  }
}

export {
  receberWebhookAsaas
};