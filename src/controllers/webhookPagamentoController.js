import connection from '../db_config/connection.js';
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

function isUniqueViolationError(error) {
  return error?.code === '23505';
}

function parseAssinanteIdFromExternalReference(externalReference) {
  const match = String(externalReference || '')
    .trim()
    .match(/^assinante:(\d+)$/i);

  return match ? Number(match[1]) : null;
}

function normalizeMoneyValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number(numericValue.toFixed(2));
}

function isSameMoneyValue(firstValue, secondValue) {
  const first = normalizeMoneyValue(firstValue);
  const second = normalizeMoneyValue(secondValue);

  if (first === null || second === null) {
    return false;
  }

  return first.toFixed(2) === second.toFixed(2);
}

function getExpectedExternalReference(assinante) {
  return assinante?.id ? `assinante:${assinante.id}` : null;
}

function gatewayCustomerMatchesAssinante(normalizedEvent, assinante) {
  if (!normalizedEvent.gatewayCustomerId || !assinante.gateway_customer_id) {
    return true;
  }

  return normalizedEvent.gatewayCustomerId === assinante.gateway_customer_id;
}

function gatewaySubscriptionMatchesCurrentAssinante(normalizedEvent, assinante) {
  if (!normalizedEvent.gatewaySubscriptionId || !assinante.gateway_subscription_id) {
    return false;
  }

  return normalizedEvent.gatewaySubscriptionId === assinante.gateway_subscription_id;
}

function externalReferenceMatchesAssinante(normalizedEvent, assinante) {
  const expectedExternalReference = getExpectedExternalReference(assinante);

  if (!expectedExternalReference) {
    return false;
  }

  return normalizedEvent.externalReference === expectedExternalReference;
}

function paymentValueMatchesAssinante(normalizedEvent, assinante) {
  if (normalizedEvent.paymentValue === null || normalizedEvent.paymentValue === undefined) {
    return false;
  }

  return isSameMoneyValue(normalizedEvent.paymentValue, assinante.valor_mensal);
}

function getAdvisoryLockKey(value) {
  let hash = 0;
  const text = String(value || '');

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }

  return hash;
}

async function resolveAssinanteFromEvent(normalizedEvent) {
  const assinanteIdFromReference = parseAssinanteIdFromExternalReference(
    normalizedEvent.externalReference
  );

  if (assinanteIdFromReference) {
    const assinante = await AssinanteModel.findById(assinanteIdFromReference);

    if (assinante) {
      return assinante;
    }
  }

  return AssinanteModel.findByGatewayReference({
    gatewayCustomerId: normalizedEvent.gatewayCustomerId,
    gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
  });
}

async function createPaymentEventSafely(normalizedEvent, assinante) {
  try {
    return {
      duplicated: false,
      event: await PaymentEventModel.create({
        ...normalizedEvent,
        assinanteId: assinante?.id || null
      })
    };
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const duplicatedEvent = await PaymentEventModel.findDuplicate(normalizedEvent);

    return {
      duplicated: true,
      event: duplicatedEvent || null
    };
  }
}

async function validateConfirmedPaymentEvent(normalizedEvent, assinante) {
  if (!normalizedEvent.gatewayPaymentId) {
    return {
      valid: false,
      reason: 'confirmed_payment_without_gateway_payment_id'
    };
  }

  const alreadyProcessed =
    await PaymentEventModel.findProcessedConfirmationByGatewayPaymentId(
      normalizedEvent.gatewayPaymentId,
      normalizedEvent.provider
    );

  if (alreadyProcessed) {
    return {
      valid: false,
      reason: 'confirmed_payment_already_processed'
    };
  }

  if (!externalReferenceMatchesAssinante(normalizedEvent, assinante)) {
    return {
      valid: false,
      reason: 'external_reference_mismatch_or_missing'
    };
  }

  if (!gatewayCustomerMatchesAssinante(normalizedEvent, assinante)) {
    return {
      valid: false,
      reason: 'gateway_customer_mismatch'
    };
  }

  if (!paymentValueMatchesAssinante(normalizedEvent, assinante)) {
    return {
      valid: false,
      reason: 'payment_value_mismatch'
    };
  }

  return {
    valid: true,
    reason: 'confirmed_payment_validated'
  };
}

async function processConfirmedPaymentEvent(normalizedEvent, assinante, event) {
  const validation = await validateConfirmedPaymentEvent(normalizedEvent, assinante);

  if (!validation.valid) {
    await PaymentEventModel.markAsIgnored(event.id, validation.reason);

    return {
      processed: false,
      ignored: true,
      reason: validation.reason,
      assinante: null
    };
  }

  const lockKey = getAdvisoryLockKey(
    `${normalizedEvent.provider}:${normalizedEvent.gatewayPaymentId}`
  );

  const client = await connection.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    const alreadyProcessedResult = await client.query(
      `SELECT id
       FROM payment_events
       WHERE provider = $1
         AND gateway_payment_id = $2
         AND event_type IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
         AND processed_at IS NOT NULL
       ORDER BY processed_at ASC, id ASC
       LIMIT 1`,
      [normalizedEvent.provider, normalizedEvent.gatewayPaymentId]
    );

    if (alreadyProcessedResult.rows[0]) {
      await client.query(
        `UPDATE payment_events
         SET
           ignored_at = NOW(),
           processing_reason = $2
         WHERE id = $1`,
        [event.id, 'confirmed_payment_already_processed']
      );

      await client.query('COMMIT');

      return {
        processed: false,
        ignored: true,
        reason: 'confirmed_payment_already_processed',
        assinante: null
      };
    }

    const parsedPaymentDate = normalizedEvent.paymentDate
      ? new Date(normalizedEvent.paymentDate)
      : new Date();

    const safePaymentDate = Number.isNaN(parsedPaymentDate.getTime())
      ? new Date()
      : parsedPaymentDate;

    const updatedAssinanteResult = await client.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'ativo',
         data_ativacao = COALESCE(data_ativacao, NOW()),
         data_vencimento = (
           CASE
             WHEN data_vencimento IS NOT NULL
               AND data_vencimento > $2::timestamptz
             THEN data_vencimento
             ELSE $2::timestamptz
           END
         ) + INTERVAL '30 days',
         gateway_subscription_id = COALESCE($3, gateway_subscription_id),
         updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         user_id,
         status_assinatura,
         data_ativacao,
         data_vencimento,
         gateway_customer_id,
         gateway_subscription_id,
         plano_codigo,
         plano_nome,
         valor_mensal`,
      [
        assinante.id,
        safePaymentDate.toISOString(),
        normalizedEvent.gatewaySubscriptionId || null
      ]
    );

    const updatedAssinante = updatedAssinanteResult.rows[0] || null;

    if (!updatedAssinante) {
      await client.query(
        `UPDATE payment_events
         SET
           ignored_at = NOW(),
           processing_reason = $2
         WHERE id = $1`,
        [event.id, 'subscription_not_changed']
      );

      await client.query('COMMIT');

      return {
        processed: false,
        ignored: true,
        reason: 'subscription_not_changed',
        assinante: null
      };
    }

    await client.query(
      `UPDATE payment_events
       SET
         processed_at = NOW(),
         ignored_at = NULL,
         processing_reason = $2
       WHERE id = $1`,
      [event.id, 'subscription_activated']
    );

    await client.query('COMMIT');

    return {
      processed: true,
      ignored: false,
      reason: 'subscription_activated',
      assinante: updatedAssinante
    };
  } catch (error) {
    await client.query('ROLLBACK');

    if (isUniqueViolationError(error)) {
      await PaymentEventModel.markAsIgnored(
        event.id,
        'confirmed_payment_already_processed_by_unique_index'
      );

      return {
        processed: false,
        ignored: true,
        reason: 'confirmed_payment_already_processed_by_unique_index',
        assinante: null
      };
    }

    throw error;
  } finally {
    client.release();
  }
}

async function processSubscriptionCancelledEvent(normalizedEvent, assinante, event) {
  if (!gatewaySubscriptionMatchesCurrentAssinante(normalizedEvent, assinante)) {
    await PaymentEventModel.markAsIgnored(
      event.id,
      'subscription_cancelled_not_current_subscription'
    );

    return {
      processed: false,
      ignored: true,
      reason: 'subscription_cancelled_not_current_subscription',
      assinante: null
    };
  }

  const updatedAssinante = await AssinanteModel.cancelFromGateway(
    assinante.id,
    {
      gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
    }
  );

  return {
    processed: Boolean(updatedAssinante),
    ignored: false,
    reason: updatedAssinante
      ? 'subscription_cancelled'
      : 'subscription_not_changed',
    assinante: updatedAssinante
  };
}

async function processPaymentOverdueEvent(normalizedEvent, assinante, event) {
  if (assinante.status_assinatura === 'ativo' || assinante.status_assinatura === 'trial') {
    await PaymentEventModel.markAsIgnored(
      event.id,
      'payment_overdue_ignored_for_active_or_trial_subscription'
    );

    return {
      processed: false,
      ignored: true,
      reason: 'payment_overdue_ignored_for_active_or_trial_subscription',
      assinante: null
    };
  }

  if (
    normalizedEvent.gatewaySubscriptionId &&
    !gatewaySubscriptionMatchesCurrentAssinante(normalizedEvent, assinante)
  ) {
    await PaymentEventModel.markAsIgnored(
      event.id,
      'payment_overdue_not_current_subscription'
    );

    return {
      processed: false,
      ignored: true,
      reason: 'payment_overdue_not_current_subscription',
      assinante: null
    };
  }

  const updatedAssinante = await AssinanteModel.markAsOverdueFromPayment(
    assinante.id,
    {
      dueDate: normalizedEvent.dueDate,
      gatewaySubscriptionId: normalizedEvent.gatewaySubscriptionId
    }
  );

  return {
    processed: Boolean(updatedAssinante),
    ignored: false,
    reason: updatedAssinante
      ? 'subscription_marked_overdue'
      : 'subscription_not_changed',
    assinante: updatedAssinante
  };
}

async function processPaymentDeletedEvent(normalizedEvent, event) {
  await PaymentEventModel.markAsIgnored(
    event.id,
    'payment_deleted_recorded_without_subscription_status_change'
  );

  return {
    processed: false,
    ignored: true,
    reason: 'payment_deleted_recorded_without_subscription_status_change',
    assinante: null
  };
}

async function processPaymentEvent(normalizedEvent, assinante, event) {
  if (!assinante?.id) {
    await PaymentEventModel.markAsIgnored(event.id, 'assinante_not_found');

    return {
      processed: false,
      ignored: true,
      reason: 'assinante_not_found',
      assinante: null
    };
  }

  if (normalizedEvent.isPaymentConfirmed) {
    return processConfirmedPaymentEvent(normalizedEvent, assinante, event);
  }

  if (normalizedEvent.isSubscriptionCancelled) {
    return processSubscriptionCancelledEvent(normalizedEvent, assinante, event);
  }

  if (normalizedEvent.isPaymentOverdue) {
    return processPaymentOverdueEvent(normalizedEvent, assinante, event);
  }

  if (normalizedEvent.isPaymentDeleted) {
    return processPaymentDeletedEvent(normalizedEvent, event);
  }

  await PaymentEventModel.markAsIgnored(event.id, 'event_not_actionable');

  return {
    processed: false,
    ignored: true,
    reason: 'event_not_actionable',
    assinante: null
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
    const eventCreationResult = await createPaymentEventSafely(
      normalizedEvent,
      assinante
    );

    if (eventCreationResult.duplicated) {
      return res.status(200).json({
        received: true,
        duplicated: true,
        eventId: eventCreationResult.event?.id || null
      });
    }

    const event = eventCreationResult.event;
    const processingResult = await processPaymentEvent(
      normalizedEvent,
      assinante,
      event
    );

    if (
      processingResult.processed &&
      processingResult.reason !== 'subscription_activated'
    ) {
      await PaymentEventModel.markAsProcessed(event.id, processingResult.reason);
    }

    return res.status(200).json({
      received: true,
      duplicated: false,
      eventId: event.id,
      eventType: normalizedEvent.eventType,
      status: normalizedEvent.status,
      assinanteId: assinante?.id || null,
      processed: processingResult.processed,
      ignored: processingResult.ignored,
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