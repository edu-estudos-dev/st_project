import connection from '../db_config/connection.js';
import {
  parseStoredProdutos,
  serializeProdutos
} from '../utilities/produtoUtils.js';

const ADMIN_UPDATE_FIELDS = new Set([
  'status_assinatura',
  'tipo_cobranca',
  'produtos_habilitados',
  'plano_codigo',
  'plano_nome',
  'valor_mensal',
  'trial_fim',
  'data_ativacao',
  'data_vencimento',
  'data_limite_exclusao',
  'gateway_customer_id',
  'gateway_subscription_id'
]);

class AssinanteModel {
  constructor() {
    this.produtosSchemaReadyPromise = null;
    this.billingSchemaReadyPromise = null;
  }

  async ensureProdutosHabilitadosColumn() {
    if (!this.produtosSchemaReadyPromise) {
      this.produtosSchemaReadyPromise = (async () => {
        await connection.query(`
          ALTER TABLE assinantes
          ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT,
          ADD COLUMN IF NOT EXISTS plano_codigo VARCHAR(50),
          ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(100),
          ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10, 2)
        `);
      })().catch((error) => {
        this.produtosSchemaReadyPromise = null;
        throw error;
      });
    }

    return this.produtosSchemaReadyPromise;
  }

  async ensureBillingColumns() {
    if (!this.billingSchemaReadyPromise) {
      this.billingSchemaReadyPromise = connection.query(`
        ALTER TABLE assinantes
        ADD COLUMN IF NOT EXISTS billing_nome VARCHAR(150),
        ADD COLUMN IF NOT EXISTS billing_cpf_cnpj VARCHAR(20),
        ADD COLUMN IF NOT EXISTS billing_email VARCHAR(150),
        ADD COLUMN IF NOT EXISTS billing_telefone VARCHAR(30)
      `).catch((error) => {
        this.billingSchemaReadyPromise = null;
        throw error;
      });
    }

    return this.billingSchemaReadyPromise;
  }

  normalizeRow(row) {
    if (!row) return null;

    return {
      ...row,
      produtos_habilitados_lista: parseStoredProdutos(row.produtos_habilitados)
    };
  }

  async expireOverdueSubscriptions(whereSql, params) {
    await this.ensureProdutosHabilitadosColumn();

    await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'vencido',
         updated_at = NOW()
       WHERE ${whereSql}
         AND status_assinatura IN ('trial', 'ativo')
         AND (
           (status_assinatura = 'trial' AND trial_fim IS NOT NULL AND trial_fim < NOW())
           OR
           (status_assinatura = 'ativo' AND data_vencimento IS NOT NULL AND data_vencimento < NOW())
         )`,
      params
    );
  }

  async expireAllOverdueSubscriptionsForMaintenance() {
    await this.ensureProdutosHabilitadosColumn();
    await this.ensureBillingColumns();

    const expiredResult = await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'vencido',
         data_vencimento = CASE
           WHEN status_assinatura = 'trial' THEN COALESCE(data_vencimento, trial_fim)
           ELSE data_vencimento
         END,
         updated_at = NOW()
       WHERE status_assinatura IN ('trial', 'ativo')
         AND (
           (status_assinatura = 'trial' AND trial_fim IS NOT NULL AND trial_fim < NOW())
           OR
           (status_assinatura = 'ativo' AND data_vencimento IS NOT NULL AND data_vencimento < NOW())
         )
       RETURNING
         id,
         user_id,
         status_assinatura,
         tipo_cobranca,
         trial_inicio,
         trial_fim,
         data_ativacao,
         data_vencimento,
         data_limite_exclusao,
         gateway_customer_id,
         gateway_subscription_id,
         billing_nome,
         billing_cpf_cnpj,
         billing_email,
         billing_telefone,
         produtos_habilitados,
         plano_codigo,
         plano_nome,
         valor_mensal,
         updated_at`
    );

    const cancelledResult = await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'cancelado',
         updated_at = NOW()
       WHERE status_assinatura IN ('vencido', 'bloqueado')
         AND COALESCE(data_vencimento, trial_fim) IS NOT NULL
         AND COALESCE(data_vencimento, trial_fim) < NOW() - INTERVAL '30 days'
       RETURNING
         id,
         user_id,
         status_assinatura,
         tipo_cobranca,
         trial_inicio,
         trial_fim,
         data_ativacao,
         data_vencimento,
         data_limite_exclusao,
         gateway_customer_id,
         gateway_subscription_id,
         billing_nome,
         billing_cpf_cnpj,
         billing_email,
         billing_telefone,
         produtos_habilitados,
         plano_codigo,
         plano_nome,
         valor_mensal,
         updated_at`
    );

    const blockedResult = await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'bloqueado',
         updated_at = NOW()
       WHERE status_assinatura = 'vencido'
         AND COALESCE(data_vencimento, trial_fim) IS NOT NULL
         AND COALESCE(data_vencimento, trial_fim) < NOW() - INTERVAL '3 days'
       RETURNING
         id,
         user_id,
         status_assinatura,
         tipo_cobranca,
         trial_inicio,
         trial_fim,
         data_ativacao,
         data_vencimento,
         data_limite_exclusao,
         gateway_customer_id,
         gateway_subscription_id,
         billing_nome,
         billing_cpf_cnpj,
         billing_email,
         billing_telefone,
         produtos_habilitados,
         plano_codigo,
         plano_nome,
         valor_mensal,
         updated_at`
    );

    return {
      expiredSubscriptions: expiredResult.rows.map(row =>
        this.normalizeRow(row)
      ),
      blockedSubscriptions: blockedResult.rows.map(row =>
        this.normalizeRow(row)
      ),
      cancelledSubscriptions: cancelledResult.rows.map(row =>
        this.normalizeRow(row)
      )
    };
  }

  async findById(id) {
    await this.expireOverdueSubscriptions('id = $1', [id]);
    await this.ensureBillingColumns();

    const result = await connection.query(
      `SELECT
        id,
        user_id,
        status_assinatura,
        tipo_cobranca,
        trial_inicio,
        trial_fim,
        data_ativacao,
        data_vencimento,
        data_limite_exclusao,
        gateway_customer_id,
        gateway_subscription_id,
        billing_nome,
        billing_cpf_cnpj,
        billing_email,
        billing_telefone,
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal
      FROM assinantes
      WHERE id = $1
      LIMIT 1`,
      [id]
    );

    return this.normalizeRow(result.rows[0]);
  }

  async findByUserId(userId) {
    await this.expireOverdueSubscriptions('user_id = $1', [userId]);
    await this.ensureBillingColumns();

    const result = await connection.query(
      `SELECT
        id,
        user_id,
        status_assinatura,
        tipo_cobranca,
        trial_inicio,
        trial_fim,
        data_ativacao,
        data_vencimento,
        data_limite_exclusao,
        gateway_customer_id,
        gateway_subscription_id,
        billing_nome,
        billing_cpf_cnpj,
        billing_email,
        billing_telefone,
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal
      FROM assinantes
      WHERE user_id = $1
      LIMIT 1`,
      [userId]
    );

    return this.normalizeRow(result.rows[0]);
  }

  async findAdminById(id) {
    await this.expireOverdueSubscriptions('id = $1', [id]);
    await this.ensureBillingColumns();

    const result = await connection.query(
      `SELECT
        a.id,
        a.user_id,
        u.username,
        u.email,
        a.status_assinatura,
        a.tipo_cobranca,
        a.trial_inicio,
        a.trial_fim,
        a.data_ativacao,
        a.data_vencimento,
        a.data_limite_exclusao,
        a.gateway_customer_id,
        a.gateway_subscription_id,
        a.billing_nome,
        a.billing_cpf_cnpj,
        a.billing_email,
        a.billing_telefone,
        a.produtos_habilitados,
        a.plano_codigo,
        a.plano_nome,
        a.valor_mensal,
        a.created_at,
        a.updated_at
      FROM assinantes a
      INNER JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
      LIMIT 1`,
      [id]
    );

    return this.normalizeRow(result.rows[0]);
  }

  async listForAdmin() {
    const traceId = `AssinanteModel.listForAdmin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.time(`[${traceId}] total`);
    console.time(`[${traceId}] expireOverdueSubscriptions`);
    await this.expireOverdueSubscriptions('TRUE', []);
    console.timeEnd(`[${traceId}] expireOverdueSubscriptions`);

    console.time(`[${traceId}] ensureBillingColumns`);
    await this.ensureBillingColumns();
    console.timeEnd(`[${traceId}] ensureBillingColumns`);

    console.time(`[${traceId}] query`);
    const result = await connection.query(
      `WITH
        estabelecimentos_count AS (
          SELECT assinante_id, COUNT(*)::int AS total
          FROM estabelecimentos
          GROUP BY assinante_id
        ),
        lancamentos_count AS (
          SELECT assinante_id, COUNT(*)::int AS total
          FROM lancamentos
          GROUP BY assinante_id
        ),
        bolinhas_count AS (
          SELECT assinante_id, COUNT(*)::int AS total
          FROM sangrias_bolinha
          GROUP BY assinante_id
        ),
        consignados_count AS (
          SELECT assinante_id, COUNT(*)::int AS total
          FROM sangrias_consignados
          GROUP BY assinante_id
        ),
        pelucias_count AS (
          SELECT assinante_id, COUNT(*)::int AS total
          FROM sangrias_pelucias
          GROUP BY assinante_id
        )
       SELECT
         a.id,
         a.user_id,
         u.username,
         u.email,
         a.status_assinatura,
         a.tipo_cobranca,
         a.trial_inicio,
         a.trial_fim,
         a.data_ativacao,
         a.data_vencimento,
         a.data_limite_exclusao,
         a.billing_nome,
         a.billing_cpf_cnpj,
         a.billing_email,
         a.billing_telefone,
         a.produtos_habilitados,
         a.plano_codigo,
         a.plano_nome,
         a.valor_mensal,
         a.created_at,
         a.updated_at,
         COALESCE(ec.total, 0)::int AS estabelecimentos,
         COALESCE(lc.total, 0)::int AS lancamentos,
         COALESCE(bc.total, 0)::int AS bolinhas,
         COALESCE(cc.total, 0)::int AS consignados,
         COALESCE(pc.total, 0)::int AS pelucias
      FROM assinantes a
      INNER JOIN users u ON u.id = a.user_id
      LEFT JOIN estabelecimentos_count ec ON ec.assinante_id = a.id
      LEFT JOIN lancamentos_count lc ON lc.assinante_id = a.id
      LEFT JOIN bolinhas_count bc ON bc.assinante_id = a.id
      LEFT JOIN consignados_count cc ON cc.assinante_id = a.id
      LEFT JOIN pelucias_count pc ON pc.assinante_id = a.id
      ORDER BY a.id ASC`
    );
    console.timeEnd(`[${traceId}] query`);

    console.log(`[${traceId}] rows`, {
      totalAssinantes: result.rowCount
    });
    console.timeEnd(`[${traceId}] total`);

    return result.rows.map(row => this.normalizeRow(row));
  }

  async updateGatewayCustomerId(id, gatewayCustomerId) {
    if (!id) {
      throw new Error(
        'ID do assinante é obrigatório para salvar gateway_customer_id.'
      );
    }

    if (!gatewayCustomerId || String(gatewayCustomerId).trim() === '') {
      throw new Error('gateway_customer_id é obrigatório.');
    }

    const result = await connection.query(
      `UPDATE assinantes
       SET
         gateway_customer_id = $2,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, gateway_customer_id`,
      [id, String(gatewayCustomerId).trim()]
    );

    return result.rows[0] || null;
  }

  async updateGatewaySubscriptionId(id, gatewaySubscriptionId) {
    if (!id) {
      throw new Error(
        'ID do assinante é obrigatório para salvar gateway_subscription_id.'
      );
    }

    if (!gatewaySubscriptionId || String(gatewaySubscriptionId).trim() === '') {
      throw new Error('gateway_subscription_id é obrigatório.');
    }

    const result = await connection.query(
      `UPDATE assinantes
       SET
         gateway_subscription_id = $2,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, gateway_subscription_id`,
      [id, String(gatewaySubscriptionId).trim()]
    );

    return result.rows[0] || null;
  }

  async updateBillingData(id, billingData) {
    await this.ensureBillingColumns();

    if (!id) {
      throw new Error(
        'ID do assinante é obrigatório para salvar dados de cobrança.'
      );
    }

    const result = await connection.query(
      `UPDATE assinantes
       SET
         billing_nome = $2,
         billing_cpf_cnpj = $3,
         billing_email = $4,
         billing_telefone = $5,
         updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         billing_nome,
         billing_cpf_cnpj,
         billing_email,
         billing_telefone`,
      [
        id,
        billingData.billing_nome,
        billingData.billing_cpf_cnpj,
        billingData.billing_email,
        billingData.billing_telefone
      ]
    );

    return result.rows[0] || null;
  }

  async updateFromAdmin(id, data) {
    await this.ensureProdutosHabilitadosColumn();

    if (Object.prototype.hasOwnProperty.call(data, 'produtos_habilitados')) {
      data.produtos_habilitados = serializeProdutos(data.produtos_habilitados);
    }

    const entries = Object.entries(data).filter(([key]) =>
      ADMIN_UPDATE_FIELDS.has(key)
    );

    if (!entries.length) {
      return this.findAdminById(id);
    }

    const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
    const values = entries.map(([, value]) => value);

    const result = await connection.query(
      `UPDATE assinantes
       SET
         ${assignments.join(',\n         ')},
         updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, ...values]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return this.findAdminById(id);
  }

  async findByGatewayReference({
    gatewayCustomerId = null,
    gatewaySubscriptionId = null
  }) {
    await this.ensureBillingColumns();

    if (!gatewayCustomerId && !gatewaySubscriptionId) {
      return null;
    }

    const conditions = [];
    const params = [];

    if (gatewayCustomerId) {
      params.push(gatewayCustomerId);
      conditions.push(`gateway_customer_id = $${params.length}`);
    }

    if (gatewaySubscriptionId) {
      params.push(gatewaySubscriptionId);
      conditions.push(`gateway_subscription_id = $${params.length}`);
    }

    const result = await connection.query(
      `SELECT
        id,
        user_id,
        status_assinatura,
        tipo_cobranca,
        trial_inicio,
        trial_fim,
        data_ativacao,
        data_vencimento,
        data_limite_exclusao,
        gateway_customer_id,
        gateway_subscription_id,
        billing_nome,
        billing_cpf_cnpj,
        billing_email,
        billing_telefone,
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal
      FROM assinantes
      WHERE ${conditions.join(' OR ')}
      ORDER BY id ASC
      LIMIT 1`,
      params
    );

    return this.normalizeRow(result.rows[0]);
  }

  async activateAfterConfirmedPayment(
    id,
    { paymentDate = null, gatewaySubscriptionId = null } = {}
  ) {
    if (!id) {
      throw new Error('ID do assinante é obrigatório para ativar assinatura.');
    }

    const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    const safePaymentDate = Number.isNaN(parsedPaymentDate.getTime())
      ? new Date()
      : parsedPaymentDate;

    const result = await connection.query(
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
      [id, safePaymentDate.toISOString(), gatewaySubscriptionId || null]
    );

    return result.rows[0] || null;
  }

  async markAsOverdueFromPayment(
    id,
    { dueDate = null, gatewaySubscriptionId = null } = {}
  ) {
    if (!id) {
      throw new Error(
        'ID do assinante é obrigatório para marcar assinatura vencida.'
      );
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const safeDueDate =
      parsedDueDate && !Number.isNaN(parsedDueDate.getTime())
        ? parsedDueDate
        : null;

    const result = await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'vencido',
         data_vencimento = COALESCE($2::timestamptz, data_vencimento, NOW()),
         gateway_subscription_id = COALESCE($3, gateway_subscription_id),
         updated_at = NOW()
       WHERE id = $1
         AND status_assinatura NOT IN ('bloqueado', 'cancelado')
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
        id,
        safeDueDate ? safeDueDate.toISOString() : null,
        gatewaySubscriptionId || null
      ]
    );

    return result.rows[0] || null;
  }

  async cancelFromGateway(id, { gatewaySubscriptionId = null } = {}) {
    if (!id) {
      throw new Error(
        'ID do assinante é obrigatório para cancelar assinatura.'
      );
    }

    const result = await connection.query(
      `UPDATE assinantes
       SET
         status_assinatura = 'cancelado',
         gateway_subscription_id = COALESCE($2, gateway_subscription_id),
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
      [id, gatewaySubscriptionId || null]
    );

    return result.rows[0] || null;
  }
}

export default new AssinanteModel();
