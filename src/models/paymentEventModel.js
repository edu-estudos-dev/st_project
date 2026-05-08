import connection from '../db_config/connection.js';

class PaymentEventModel {
  async create({
    assinanteId = null,
    provider = 'asaas',
    eventType,
    gatewayEventId = null,
    gatewayPaymentId = null,
    gatewaySubscriptionId = null,
    status = null,
    payload
  }) {
    const result = await connection.query(
      `INSERT INTO payment_events (
        assinante_id,
        provider,
        event_type,
        gateway_event_id,
        gateway_payment_id,
        gateway_subscription_id,
        status,
        payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        assinanteId,
        provider,
        eventType,
        gatewayEventId,
        gatewayPaymentId,
        gatewaySubscriptionId,
        status,
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

  async markAsProcessed(id) {
    const result = await connection.query(
      `UPDATE payment_events
       SET processed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] || null;
  }
}

export default new PaymentEventModel();