import connection from '../db_config/connection.js';

class PeluciasModel {
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
      observacoes,
      leitura_atual,
      ultima_leitura = null,
      abastecido = null,
      qtde_vendido = null,
      estoque = null
    } = sangria;

    const query = `
      INSERT INTO sangrias_pelucias (
        assinante_id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        valor_comerciante,
        valor_liquido,
        tipo_pagamento,
        observacoes,
        leitura_atual,
        ultima_leitura,
        abastecido,
        qtde_vendido,
        estoque
      )
      SELECT $1, e.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      FROM estabelecimentos e
      WHERE e.id = $2
        AND e.assinante_id = $1
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
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
      observacoes,
      leitura_atual,
      ultima_leitura,
      abastecido,
      qtde_vendido,
      estoque
    ]);

    if (result.rowCount === 0) {
      throw new Error('Estabelecimento de pelucias nao encontrado para este assinante.');
    }

    return result;
  };

  getUltimoEstoque = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT estoque
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows[0] || { estoque: 0 };
  };

  getUltimaLeitura = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT leitura_atual AS ultima_leitura
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows[0] || { ultima_leitura: 0 };
  };

  getUltimosDados = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT leitura_atual AS ultima_leitura, estoque
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows[0] || { ultima_leitura: 0, estoque: 0 };
  };

  getSangrias = async (assinanteId) => {
    const query = `
      SELECT s.*, e.estabelecimento
      FROM sangrias_pelucias s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
        AND s.valor_apurado <> 0
      ORDER BY s.data_sangria DESC, s.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getEstabelecimentos = async (assinanteId) => {
    const query = `
      SELECT *
      FROM estabelecimentos
      WHERE assinante_id = $1
        AND UPPER(produto) LIKE '%PELUCIAS%'
        AND status = 'ativo'
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
        e.maquina
      FROM sangrias_pelucias s
      JOIN estabelecimentos e
        ON s.estabelecimento_id = e.id
       AND s.assinante_id = e.assinante_id
      WHERE s.id = $1
        AND s.assinante_id = $2
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
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
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes,
      leitura_atual,
      abastecido,
      qtde_vendido
    } = sangria;

    const query = `
      UPDATE sangrias_pelucias s
      SET
        estabelecimento_id = e.id,
        data_sangria = $2,
        valor_apurado = $3,
        comissao = $4,
        valor_comerciante = $5,
        valor_liquido = $6,
        tipo_pagamento = $7,
        observacoes = $8,
        leitura_atual = $9,
        abastecido = $10,
        qtde_vendido = $11,
        data_atualizacao = CURRENT_TIMESTAMP
      FROM estabelecimentos e
      WHERE s.id = $12
        AND s.assinante_id = $13
        AND e.id = $1
        AND e.assinante_id = $13
        AND e.status = 'ativo'
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
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
      leitura_atual,
      abastecido,
      qtde_vendido,
      id,
      assinante_id
    ]);

    if (result.rowCount === 0) {
      throw new Error('Sangria de pelucias nao encontrada para este assinante.');
    }

    return result;
  };

  deleteSangria = async (id, assinanteId) => {
    const query = `
      DELETE FROM sangrias_pelucias
      WHERE id = $1
        AND assinante_id = $2
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $2
            AND UPPER(produto) LIKE '%PELUCIAS%'
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
      FROM sangrias_pelucias
      WHERE assinante_id = $1
        AND estabelecimento_id IN (
          SELECT id
          FROM estabelecimentos
          WHERE assinante_id = $1
            AND UPPER(produto) LIKE '%PELUCIAS%'
        )
      GROUP BY ano, mes
      ORDER BY ano, mes
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getControleGeralPelucias = async (assinanteId) => {
    const query = `
      SELECT
        sp.id,
        e.estabelecimento,
        sp.data_sangria AS data,
        sp.leitura_atual,
        sp.ultima_leitura,
        sp.abastecido,
        sp.observacoes
      FROM estabelecimentos e
      JOIN sangrias_pelucias sp
        ON e.id = sp.estabelecimento_id
       AND e.assinante_id = sp.assinante_id
      WHERE e.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getUltimaSangria = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT *
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows;
  };

  getUltimaDataSangria = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT data_sangria
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows[0] || { data_sangria: '1970-01-01' };
  };

  hasSangria = async (estabelecimentoId, assinanteId) => {
    const query = `
      SELECT id
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
        AND assinante_id = $2
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId, assinanteId]);
    return result.rows.length > 0;
  };

  getAllSangrias = async (assinanteId) => {
    const query = `
      SELECT
        sp.id,
        e.estabelecimento,
        sp.data_sangria AS data,
        sp.leitura_atual,
        sp.ultima_leitura,
        sp.abastecido,
        sp.observacoes
      FROM sangrias_pelucias sp
      JOIN estabelecimentos e
        ON sp.estabelecimento_id = e.id
       AND sp.assinante_id = e.assinante_id
      WHERE sp.assinante_id = $1
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getLatestSangriaForAllEstabelecimentos = async (assinanteId) => {
    const query = `
      SELECT
        sp.id,
        e.estabelecimento,
        e.endereco,
        e.bairro,
        e.telefone_contato,
        sp.data_sangria AS data,
        sp.leitura_atual,
        sp.ultima_leitura,
        sp.abastecido,
        sp.estoque,
        e.maquina,
        sp.observacoes
      FROM estabelecimentos e
      JOIN sangrias_pelucias sp
        ON e.id = sp.estabelecimento_id
       AND e.assinante_id = sp.assinante_id
      WHERE e.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
        AND sp.data_sangria = (
          SELECT MAX(inner_sp.data_sangria)
          FROM sangrias_pelucias inner_sp
          WHERE inner_sp.estabelecimento_id = e.id
            AND inner_sp.assinante_id = e.assinante_id
        )
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };
}

export default new PeluciasModel();
