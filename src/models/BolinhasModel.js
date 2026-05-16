import connection from '../db_config/connection.js';

class BolinhasModel {
  createSangria = async sangria => {
    const {
      assinante_id,
      estabelecimento_id,
      data_sangria,
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes
    } = sangria;

    const query = `
      INSERT INTO sangrias_bolinha (
        assinante_id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        valor_comerciante,
        valor_liquido,
        tipo_pagamento,
        observacoes
      )
      SELECT $1, e.id, $3, $4, $5, $6, $7, $8, $9
      FROM estabelecimentos e
      WHERE e.id = $2
        AND e.assinante_id = $1
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
      RETURNING id
    `;

    const result = await connection.query(query, [
      assinante_id,
      estabelecimento_id,
      data_sangria,
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes
    ]);

    if (result.rowCount === 0) {
      throw new Error('Estabelecimento de bolinhas nao encontrado para este assinante.');
    }

    return result;
  };

  getSangrias = async (assinanteId) => {
    const query = `
      SELECT s.*, e.estabelecimento
      FROM sangrias_bolinha s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.assinante_id = $1
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
      ORDER BY s.data_sangria DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getSangriasPage = async (assinanteId, { limit = 50, offset = 0 } = {}) => {
    const query = `
      SELECT s.*, e.estabelecimento, COUNT(*) OVER()::int AS total_count
      FROM sangrias_bolinha s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.assinante_id = $1
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
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

  getSangriaById = async (id, assinanteId) => {
    const query = `
      SELECT s.*, e.estabelecimento
      FROM sangrias_bolinha s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.id = $1
        AND s.assinante_id = $2
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
    `;

    const result = await connection.query(query, [id, assinanteId]);
    return result.rows;
  };

  updateSangria = async sangria => {
    const {
      assinante_id,
      id,
      estabelecimento_id,
      data_sangria,
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes
    } = sangria;

    const query = `
      UPDATE sangrias_bolinha s
      SET
        estabelecimento_id = e.id,
        data_sangria = $2,
        valor_apurado = $3,
        comissao = $4,
        valor_comerciante = $5,
        valor_liquido = $6,
        tipo_pagamento = $7,
        observacoes = $8,
        data_atualizacao = CURRENT_TIMESTAMP
      FROM estabelecimentos e
      WHERE s.id = $9
        AND s.assinante_id = $10
        AND e.id = $1
        AND e.assinante_id = $10
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
      RETURNING s.id
    `;

    const result = await connection.query(query, [
      estabelecimento_id,
      data_sangria,
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes,
      id,
      assinante_id
    ]);

    if (result.rowCount === 0) {
      throw new Error('Sangria de bolinhas nao encontrada para este assinante.');
    }

    return result;
  };

  deleteSangria = async (id, assinanteId) => {
    const query = `
      DELETE FROM sangrias_bolinha
      WHERE id = $1
        AND assinante_id = $2
        AND NOT EXISTS (
          SELECT 1
          FROM visita_produtos
          WHERE sangria_id = $1
            AND assinante_id = $2
            AND produto = 'BOLINHAS'
        )
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $2
            AND UPPER(produto) LIKE '%BOLINHAS%'
        )
    `;

    const result = await connection.query(query, [id, assinanteId]);
    return result;
  };

  getMonthlyRevenue = async (assinanteId) => {
    const query = `
      SELECT
        EXTRACT(YEAR FROM data_sangria) AS ano,
        EXTRACT(MONTH FROM data_sangria) AS mes,
        SUM(valor_liquido) AS total
      FROM sangrias_bolinha
      WHERE assinante_id = $1
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $1
            AND UPPER(produto) LIKE '%BOLINHAS%'
        )
      GROUP BY ano, mes
      ORDER BY ano, mes
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getEstabelecimentos = async (assinanteId) => {
    const query = `
      SELECT *
      FROM estabelecimentos
      WHERE assinante_id = $1
        AND UPPER(produto) LIKE '%BOLINHAS%'
        AND status = 'ativo'
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getControleGeral = async (assinanteId) => {
    const query = `
      SELECT
        e.id,
        e.estabelecimento,
        e.chave,
        e.maquina,
        e.endereco,
        e.bairro,
        MAX(s.data_sangria) AS data
      FROM estabelecimentos e
      LEFT JOIN sangrias_bolinha s
        ON e.id = s.estabelecimento_id
       AND e.assinante_id = s.assinante_id
      WHERE e.assinante_id = $1
        AND UPPER(e.produto) LIKE '%BOLINHAS%'
        AND e.status = 'ativo'
      GROUP BY
        e.id, e.estabelecimento, e.chave, e.maquina, e.endereco, e.bairro
      ORDER BY e.bairro ASC, e.estabelecimento ASC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

    updatePixConfirmado = async ({ id, assinante_id, pix_confirmado }) => {
    const query = `
      UPDATE sangrias_bolinha s
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
            AND UPPER(e.produto) LIKE '%BOLINHAS%'
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
      throw new Error('Sangria de bolinhas nao encontrada para este assinante.');
    }

    return result.rows[0];
  };
}

export default new BolinhasModel();
