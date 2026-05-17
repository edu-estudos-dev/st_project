import connection from '../db_config/connection.js';

class ConsignadosModel {
  constructor() {
    this.estabelecimentoInitialColumnsReadyPromise = null;
  }

  ensureEstabelecimentoInitialColumns = async () => {
    if (!this.estabelecimentoInitialColumnsReadyPromise) {
      this.estabelecimentoInitialColumnsReadyPromise = connection.query(`
        ALTER TABLE estabelecimentos
        ADD COLUMN IF NOT EXISTS consignado_quantidade_inicial INTEGER,
        ADD COLUMN IF NOT EXISTS pelucia_leitura_inicial INTEGER,
        ADD COLUMN IF NOT EXISTS pelucia_abastecido_inicial INTEGER
      `).catch((error) => {
        this.estabelecimentoInitialColumnsReadyPromise = null;
        throw error;
      });
    }

    await this.estabelecimentoInitialColumnsReadyPromise;
  };

  createSangria = async sangria => {
    const {
      assinante_id,
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes
    } = sangria;

    const query = `
      INSERT INTO sangrias_consignados (
        assinante_id,
        estabelecimento_id,
        data_sangria,
        qtde_deixada,
        abastecido,
        estoque,
        qtde_vendido,
        valor_apurado,
        tipo_pagamento,
        observacoes
      )
      SELECT $1, e.id, $3, $4, $5, $6, $7, $8, $9, $10
      FROM estabelecimentos e
      WHERE e.id = $2
        AND e.assinante_id = $1
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
      RETURNING id
    `;

    const result = await connection.query(query, [
      assinante_id,
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes
    ]);

    if (result.rowCount === 0) {
      throw new Error(
        'Estabelecimento de consignados nao encontrado para este assinante.'
      );
    }

    return result;
  };

  getSangrias = async assinanteId => {
    const query = `
      SELECT
        s.*,
        e.estabelecimento,
        EXISTS (
          SELECT 1
          FROM visita_produtos vp
          WHERE vp.sangria_id = s.id
            AND vp.assinante_id = s.assinante_id
            AND vp.produto = 'CONSIGNADOS'
        ) AS vinculada_visita
      FROM sangrias_consignados s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.assinante_id = $1
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
        AND COALESCE(s.observacoes, '') NOT LIKE '[ABERTURA INICIAL]%'
      ORDER BY s.data_sangria DESC
    `;
    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getSangriasPage = async (assinanteId, { limit = 50, offset = 0 } = {}) => {
    const query = `
      SELECT
        s.*,
        e.estabelecimento,
        EXISTS (
          SELECT 1
          FROM visita_produtos vp
          WHERE vp.sangria_id = s.id
            AND vp.assinante_id = s.assinante_id
            AND vp.produto = 'CONSIGNADOS'
        ) AS vinculada_visita,
        COUNT(*) OVER()::int AS total_count
      FROM sangrias_consignados s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.assinante_id = $1
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
        AND COALESCE(s.observacoes, '') NOT LIKE '[ABERTURA INICIAL]%'
      ORDER BY s.data_sangria DESC, s.id DESC
      LIMIT $2
      OFFSET $3
    `;

    const result = await connection.query(query, [assinanteId, limit, offset]);

    return {
      rows: result.rows,
      total: result.rows[0]?.total_count || 0
    };
  };

  getEstabelecimentos = async assinanteId => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      SELECT *
      FROM estabelecimentos
      WHERE assinante_id = $1
        AND UPPER(produto) LIKE '%CONSIGNADOS%'
        AND status = 'ativo'
      ORDER BY estabelecimento ASC
    `;
    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getSangriaById = async (id, assinanteId) => {
    const query = `
      SELECT
        s.*,
        e.estabelecimento,
        e.endereco,
        e.bairro,
        e.responsavel_nome,
        e.telefone_contato,
        e.maquina,
        prev.data_sangria AS data_sangria_anterior,
        prev.qtde_deixada AS qtde_anterior,
        prev.observacoes AS observacoes_anteriores
      FROM sangrias_consignados s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      LEFT JOIN LATERAL (
        SELECT
          prev.data_sangria,
          prev.qtde_deixada,
          prev.observacoes
        FROM sangrias_consignados prev
        WHERE prev.estabelecimento_id = s.estabelecimento_id
          AND prev.assinante_id = s.assinante_id
          AND prev.data_sangria < s.data_sangria
        ORDER BY prev.data_sangria DESC, prev.id DESC
        LIMIT 1
      ) prev ON TRUE
      WHERE s.id = $1
        AND s.assinante_id = $2
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
    `;

    const result = await connection.query(query, [id, assinanteId]);
    return result.rows.length ? result.rows[0] : null;
  };

  updateSangria = async sangria => {
    const {
      assinante_id,
      id,
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes
    } = sangria;

    const query = `
      UPDATE sangrias_consignados s
      SET
        estabelecimento_id = e.id,
        data_sangria = $2,
        qtde_deixada = $3,
        abastecido = $4,
        estoque = $5,
        qtde_vendido = $6,
        valor_apurado = $7,
        tipo_pagamento = $8,
        observacoes = $9,
        data_atualizacao = CURRENT_TIMESTAMP
      FROM estabelecimentos e
      WHERE s.id = $10
        AND s.assinante_id = $11
        AND e.id = $1
        AND e.assinante_id = $11
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
      RETURNING s.id
    `;

    const result = await connection.query(query, [
      estabelecimento_id,
      data_sangria,
      qtde_deixada,
      abastecido,
      estoque,
      qtde_vendido,
      valor_apurado,
      tipo_pagamento,
      observacoes,
      id,
      assinante_id
    ]);

    if (result.rowCount === 0) {
      throw new Error(
        'Sangria de consignados nao encontrada para este assinante.'
      );
    }

    return result;
  };

  deleteSangria = async (id, assinanteId) => {
    const query = `
      DELETE FROM sangrias_consignados
      WHERE id = $1
        AND assinante_id = $2
        AND NOT EXISTS (
          SELECT 1
          FROM visita_produtos
          WHERE sangria_id = $1
            AND assinante_id = $2
            AND produto = 'CONSIGNADOS'
        )
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $2
            AND UPPER(produto) LIKE '%CONSIGNADOS%'
        )
    `;
    const result = await connection.query(query, [id, assinanteId]);
    return result;
  };

  getUltimaSangria = async (estabelecimentoId, assinanteId) => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      WITH ultima_sangria AS (
        SELECT
          sc.id,
          sc.assinante_id,
          sc.estabelecimento_id,
          sc.data_sangria,
          sc.qtde_deixada,
          sc.abastecido,
          sc.estoque,
          sc.qtde_vendido,
          sc.valor_apurado,
          sc.tipo_pagamento,
          sc.observacoes,
          false AS origem_cadastro_inicial
        FROM sangrias_consignados sc
        WHERE sc.estabelecimento_id = $1
          AND sc.assinante_id = $2
        ORDER BY sc.data_sangria DESC, sc.id DESC
        LIMIT 1
      ),
      cadastro_inicial AS (
        SELECT
          NULL::integer AS id,
          e.assinante_id,
          e.id AS estabelecimento_id,
          NULL::date AS data_sangria,
          e.consignado_quantidade_inicial AS qtde_deixada,
          e.consignado_quantidade_inicial AS abastecido,
          0 AS estoque,
          0 AS qtde_vendido,
          0::numeric AS valor_apurado,
          'especie'::text AS tipo_pagamento,
          '[ABERTURA INICIAL] Ponto iniciado pela edição do estabelecimento.'::text AS observacoes,
          true AS origem_cadastro_inicial
        FROM estabelecimentos e
        WHERE e.id = $1
          AND e.assinante_id = $2
          AND e.status = 'ativo'
          AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
          AND e.consignado_quantidade_inicial IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM ultima_sangria)
      )
      SELECT *
      FROM ultima_sangria

      UNION ALL

      SELECT *
      FROM cadastro_inicial
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId
    ]);
    return result.rows;
  };

  getPreviousSangriaBeforeDate = async ({
    estabelecimentoId,
    assinanteId,
    dataSangria,
    excludeId = null
  }) => {
    const query = `
      SELECT *
      FROM sangrias_consignados
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
        AND id <> COALESCE($4::BIGINT, -1)
        AND data_sangria < $3::date
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId,
      dataSangria,
      excludeId
    ]);

    return result.rows[0] || null;
  };

  hasLaterSangria = async ({
    estabelecimentoId,
    assinanteId,
    dataSangria,
    id
  }) => {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM sangrias_consignados
        WHERE estabelecimento_id = $1
          AND assinante_id = $2
          AND id <> $4
          AND (
            data_sangria > $3::date
            OR (data_sangria = $3::date AND id > $4)
          )
      ) AS has_later
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId,
      dataSangria,
      id
    ]);

    return Boolean(result.rows[0]?.has_later);
  };

  hasSangriaOnDate = async ({
    estabelecimentoId,
    assinanteId,
    dataSangria,
    excludeId = null
  }) => {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM sangrias_consignados
        WHERE estabelecimento_id = $1
          AND assinante_id = $2
          AND data_sangria = $3::date
          AND id <> COALESCE($4::BIGINT, -1)
      ) AS exists_on_date
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId,
      dataSangria,
      excludeId
    ]);

    return Boolean(result.rows[0]?.exists_on_date);
  };

  getMonthlyRevenue = async assinanteId => {
    const query = `
      SELECT
        EXTRACT(YEAR FROM data_sangria) AS ano,
        EXTRACT(MONTH FROM data_sangria) AS mes,
        SUM(valor_apurado) AS total
      FROM sangrias_consignados
      WHERE assinante_id = $1
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $1
            AND UPPER(produto) LIKE '%CONSIGNADOS%'
        )
      GROUP BY ano, mes
      ORDER BY ano, mes
    `;
    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };
  getLatestSangriaForAllEstabelecimentos = async assinanteId => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      SELECT
        ultima.id,
        e.id AS estabelecimento_id,
        e.estabelecimento,
        e.endereco,
        e.bairro,
        e.telefone_contato,
        e.maquina,
        ultima.data_sangria,
        COALESCE(ultima.qtde_deixada, e.consignado_quantidade_inicial, 0) AS qtde_deixada,
        ultima.abastecido,
        ultima.estoque,
        ultima.observacoes,
        CASE
          WHEN ultima.id IS NULL THEN TRUE
          ELSE FALSE
        END AS sem_sangria_registrada
      FROM estabelecimentos e
      LEFT JOIN LATERAL (
        SELECT
          sf.id,
          sf.data_sangria,
          sf.qtde_deixada,
          sf.abastecido,
          sf.estoque,
          sf.observacoes
        FROM sangrias_consignados sf
        WHERE sf.estabelecimento_id = e.id
          AND sf.assinante_id = e.assinante_id
        ORDER BY sf.data_sangria DESC, sf.id DESC
        LIMIT 1
      ) ultima ON TRUE
      WHERE e.assinante_id = $1
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
      ORDER BY
        ultima.data_sangria ASC NULLS FIRST,
        e.estabelecimento ASC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  updatePixConfirmado = async ({ id, assinante_id, pix_confirmado }) => {
    const query = `
    UPDATE sangrias_consignados s
    SET
      pix_confirmado = $1,
      pix_confirmado_em = CASE
        WHEN $1 = TRUE THEN CURRENT_TIMESTAMP
        ELSE NULL
      END,
      data_atualizacao = CURRENT_TIMESTAMP
    WHERE s.id = $2
      AND s.assinante_id = $3
      AND s.estabelecimento_id IN (
        SELECT e.id
        FROM estabelecimentos e
        WHERE e.assinante_id = $3
          AND UPPER(e.produto) LIKE '%CONSIGNADOS%'
      )
    RETURNING
      s.id,
      s.pix_confirmado,
      s.pix_confirmado_em
  `;

    const result = await connection.query(query, [
      pix_confirmado,
      id,
      assinante_id
    ]);

    if (result.rowCount === 0) {
      throw new Error(
        'Sangria de consignados não encontrada para este assinante.'
      );
    }

    return result.rows[0];
  };
}

export default new ConsignadosModel();
