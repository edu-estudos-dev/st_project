import connection from '../db_config/connection.js';

class PaymentEventModel {
  async create({
    assinanteId = null,
    provider = 'asaas',
    eventType,
    gatewayEventId = null,
    gatewayPaymentId = null,
    gatewayCustomerId = null,
    gatewaySubscriptionId = null,
    status = null,
    paymentValue = null,
    billingType = null,
    externalReference = null,
    processingReason = null,
    payload
  }) {
    const result = await connection.query(
      `INSERT INTO payment_events (
        assinante_id,
        provider,
        event_type,
        gateway_event_id,
        gateway_payment_id,
        gateway_customer_id,
        gateway_subscription_id,
        status,
        payment_value,
        billing_type,
        external_reference,
        processing_reason,
        payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        assinanteId,
        provider,
        eventType,
        gatewayEventId,
        gatewayPaymentId,
        gatewayCustomerId,
        gatewaySubscriptionId,
        status,
        paymentValue,
        billingType,
        externalReference,
        processingReason,
        payload
      ]
    );

    return result.rows[0];
  }

  async findByGatewayEventId(gatewayEventId, provider = 'asaas') {
    if (!gatewayEventId) return null;

    const result = await connection.query(
      `SELECT *
       FROM payment_events
       WHERE gateway_event_id = $1
         AND provider = $2
       LIMIT 1`,
      [gatewayEventId, provider]
    );

    return result.rows[0] || null;
  }

  async findByGatewayPaymentAndType(gatewayPaymentId, eventType, provider = 'asaas') {
    if (!gatewayPaymentId || !eventType) return null;

    const result = await connection.query(
      `SELECT *
       FROM payment_events
       WHERE gateway_payment_id = $1
         AND event_type = $2
         AND provider = $3
       LIMIT 1`,
      [gatewayPaymentId, eventType, provider]
    );

    return result.rows[0] || null;
  }

  async findDuplicate(normalizedEvent) {
    if (normalizedEvent.gatewayEventId) {
      return this.findByGatewayEventId(
        normalizedEvent.gatewayEventId,
        normalizedEvent.provider
      );
    }

    return this.findByGatewayPaymentAndType(
      normalizedEvent.gatewayPaymentId,
      normalizedEvent.eventType,
      normalizedEvent.provider
    );
  }

  async findProcessedConfirmationByGatewayPaymentId(
    gatewayPaymentId,
    provider = 'asaas'
  ) {
    if (!gatewayPaymentId) return null;

    const result = await connection.query(
      `SELECT *
       FROM payment_events
       WHERE provider = $1
         AND gateway_payment_id = $2
         AND event_type IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
         AND processed_at IS NOT NULL
       ORDER BY processed_at ASC, id ASC
       LIMIT 1`,
      [provider, gatewayPaymentId]
    );

    return result.rows[0] || null;
  }

  async listByAssinanteId(assinanteId, { limit = 100 } = {}) {
    if (!assinanteId) {
      return [];
    }

    const safeLimit = Number.isInteger(Number(limit))
      ? Math.max(1, Math.min(Number(limit), 300))
      : 100;

    const result = await connection.query(
      `SELECT
        id,
        assinante_id,
        provider,
        event_type,
        gateway_event_id,
        gateway_payment_id,
        gateway_customer_id,
        gateway_subscription_id,
        status,
        payment_value,
        billing_type,
        external_reference,
        processing_reason,
        payload,
        processed_at,
        ignored_at,
        created_at
       FROM payment_events
       WHERE assinante_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [assinanteId, safeLimit]
    );

    return result.rows;
  }

  async markAsProcessed(id, processingReason = null) {
    const result = await connection.query(
      `UPDATE payment_events
       SET
         processed_at = NOW(),
         ignored_at = NULL,
         processing_reason = COALESCE($2, processing_reason)
       WHERE id = $1
       RETURNING *`,
      [id, processingReason]
    );

    return result.rows[0] || null;
  }

  async markAsIgnored(id, processingReason) {
    const result = await connection.query(
      `UPDATE payment_events
       SET
         ignored_at = NOW(),
         processing_reason = $2
       WHERE id = $1
       RETURNING *`,
      [id, processingReason]
    );

    return result.rows[0] || null;
  }
}

export default new PaymentEventModel();