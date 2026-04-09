import connection from '../db_config/connection.js';

class PeluciasModel {
  createSangria = async sangria => {
    const {
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
      ultima_leitura,
      abastecido,
      qtde_vendido,
      estoque
    ]);

    return result;
  };

  getUltimoEstoque = async estabelecimentoId => {
    const query = `
      SELECT estoque
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows[0] || { estoque: 0 };
  };

  getUltimaLeitura = async estabelecimentoId => {
    const query = `
      SELECT leitura_atual AS ultima_leitura
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows[0] || { ultima_leitura: 0 };
  };

  getUltimosDados = async estabelecimentoId => {
    const query = `
      SELECT leitura_atual AS ultima_leitura, estoque
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows[0] || { ultima_leitura: 0, estoque: 0 };
  };

  getSangrias = async () => {
    const query = `
      SELECT s.*, e.estabelecimento
      FROM sangrias_pelucias s
      JOIN estabelecimentos e ON s.estabelecimento_id = e.id
      WHERE UPPER(e.produto) LIKE '%PELUCIAS%'
      AND s.valor_apurado <> 0
      ORDER BY s.data_sangria DESC, s.id DESC
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getEstabelecimentos = async () => {
    const query = `
      SELECT * FROM estabelecimentos 
      WHERE UPPER(produto) LIKE '%PELUCIAS%' 
      AND status = 'ativo'
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getSangriaById = async id => {
    const query = `
      SELECT s.*, e.estabelecimento
      FROM sangrias_pelucias s
      JOIN estabelecimentos e ON s.estabelecimento_id = e.id
      WHERE s.id = $1 AND UPPER(e.produto) LIKE '%PELUCIAS%'
    `;

    const result = await connection.query(query, [id]);
    return result.rows.length ? result.rows[0] : null;
  };

  updateSangria = async sangria => {
    const {
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
      UPDATE sangrias_pelucias
      SET
        estabelecimento_id = $1,
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
      WHERE id = $12
      AND estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%PELUCIAS%'
      )
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
      id
    ]);

    return result;
  };

  deleteSangria = async id => {
    const query = `
      DELETE FROM sangrias_pelucias
      WHERE id = $1
      AND estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%PELUCIAS%'
      )
    `;

    const result = await connection.query(query, [id]);
    return result;
  };

  getMonthlyRevenue = async () => {
    const query = `
      SELECT
        EXTRACT(YEAR FROM data_sangria) AS ano,
        EXTRACT(MONTH FROM data_sangria) AS mes,
        SUM(valor_liquido) AS total
      FROM sangrias_pelucias
      WHERE estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%PELUCIAS%'
      )
      GROUP BY ano, mes
      ORDER BY ano, mes
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getControleGeralPelucias = async () => {
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
      JOIN sangrias_pelucias sp ON e.id = sp.estabelecimento_id
      WHERE UPPER(e.produto) LIKE '%PELUCIAS%'
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getUltimaSangria = async estabelecimentoId => {
    const query = `
      SELECT *
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows;
  };

  getUltimaDataSangria = async estabelecimentoId => {
    const query = `
      SELECT data_sangria
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      ORDER BY data_sangria DESC, id DESC
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows[0] || { data_sangria: '1970-01-01' };
  };

  hasSangria = async estabelecimentoId => {
    const query = `
      SELECT id
      FROM sangrias_pelucias
      WHERE estabelecimento_id = $1
      LIMIT 1
    `;

    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows.length > 0;
  };

  getAllSangrias = async () => {
    const query = `
      SELECT sp.id, e.estabelecimento,
        sp.data_sangria AS data,
        sp.leitura_atual,
        sp.ultima_leitura,
        sp.abastecido,
        sp.observacoes
      FROM sangrias_pelucias sp
      JOIN estabelecimentos e ON sp.estabelecimento_id = e.id
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getLatestSangriaForAllEstabelecimentos = async () => {
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
      JOIN sangrias_pelucias sp ON e.id = sp.estabelecimento_id
      WHERE UPPER(e.produto) LIKE '%PELUCIAS%'
      AND sp.data_sangria = (
        SELECT MAX(inner_sp.data_sangria)
        FROM sangrias_pelucias inner_sp
        WHERE inner_sp.estabelecimento_id = e.id
      )
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query);
    return result.rows;
  };
}

export default new PeluciasModel();
