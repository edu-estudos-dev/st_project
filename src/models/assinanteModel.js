import connection from '../db_config/connection.js';
import { parseStoredProdutos, serializeProdutos } from '../utilities/produtoUtils.js';

const ADMIN_UPDATE_FIELDS = new Set([
  'status_assinatura',
  'tipo_cobranca',
  'produtos_habilitados',
  'trial_fim',
  'data_ativacao',
  'data_vencimento',
  'data_limite_exclusao',
  'gateway_customer_id',
  'gateway_subscription_id'
]);

class AssinanteModel {
  async ensureProdutosHabilitadosColumn() {
    await connection.query(`
      ALTER TABLE assinantes
      ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT
    `);

    await connection.query(`
      UPDATE assinantes a
      SET produtos_habilitados = produtos.produtos_habilitados
      FROM (
        SELECT
          assinante_id,
          STRING_AGG(produto_key, ', ' ORDER BY produto_order) AS produtos_habilitados
        FROM (
          SELECT DISTINCT assinante_id, 'BOLINHAS' AS produto_key, 1 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%BOLINHAS%'
          UNION
          SELECT DISTINCT assinante_id, 'FIGURINHAS' AS produto_key, 2 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%FIGURINHAS%'
          UNION
          SELECT DISTINCT assinante_id, 'PELUCIAS' AS produto_key, 3 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%PELUCIAS%'
        ) origem
        GROUP BY assinante_id
      ) produtos
      WHERE a.id = produtos.assinante_id
        AND COALESCE(TRIM(a.produtos_habilitados), '') = ''
    `);
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

  async findById(id) {
    await this.expireOverdueSubscriptions('id = $1', [id]);

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
        produtos_habilitados
      FROM assinantes
      WHERE id = $1
      LIMIT 1`,
      [id]
    );

    return this.normalizeRow(result.rows[0]);
  }

  async findByUserId(userId) {
    await this.expireOverdueSubscriptions('user_id = $1', [userId]);

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
        produtos_habilitados
      FROM assinantes
      WHERE user_id = $1
      LIMIT 1`,
      [userId]
    );

    return this.normalizeRow(result.rows[0]);
  }

  async findAdminById(id) {
    await this.expireOverdueSubscriptions('id = $1', [id]);

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
        a.produtos_habilitados,
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
    await this.expireOverdueSubscriptions('TRUE', []);

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
        a.produtos_habilitados,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT e.id)::int AS estabelecimentos,
        COUNT(DISTINCT l.id)::int AS lancamentos,
        COUNT(DISTINCT sb.id)::int AS bolinhas,
        COUNT(DISTINCT sf.id)::int AS figurinhas,
        COUNT(DISTINCT sp.id)::int AS pelucias
      FROM assinantes a
      INNER JOIN users u ON u.id = a.user_id
      LEFT JOIN estabelecimentos e ON e.assinante_id = a.id
      LEFT JOIN lancamentos l ON l.assinante_id = a.id
      LEFT JOIN sangrias_bolinha sb ON sb.assinante_id = a.id
      LEFT JOIN sangrias_figurinhas sf ON sf.assinante_id = a.id
      LEFT JOIN sangrias_pelucias sp ON sp.assinante_id = a.id
      GROUP BY a.id, u.id
      ORDER BY a.id ASC`
    );

    return result.rows.map(row => this.normalizeRow(row));
  }

  async updateFromAdmin(id, data) {
    await this.ensureProdutosHabilitadosColumn();

    if (Object.prototype.hasOwnProperty.call(data, 'produtos_habilitados')) {
      data.produtos_habilitados = serializeProdutos(data.produtos_habilitados);
    }

    const entries = Object.entries(data).filter(([key]) => ADMIN_UPDATE_FIELDS.has(key));

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
}

export default new AssinanteModel();
