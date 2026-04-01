import connection from '../db_config/connection.js';

class BolinhasModel {
  createSangria = async sangria => {
    const {
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
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        valor_comerciante,
        valor_liquido,
        tipo_pagamento,
        observacoes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;

    const result = await connection.query(query, [
      estabelecimento_id,
      data_sangria,
      valor_apurado,
      comissao,
      valor_comerciante,
      valor_liquido,
      tipo_pagamento,
      observacoes
    ]);

    return result;
  };

  getSangrias = async () => {
    const query = `
      SELECT s.*, e.estabelecimento 
      FROM sangrias_bolinha s 
      JOIN estabelecimentos e ON s.estabelecimento_id = e.id
      WHERE UPPER(e.produto) LIKE '%BOLINHAS%'
      ORDER BY s.data_sangria DESC
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getSangriaById = async id => {
    const query = `
      SELECT s.*, e.estabelecimento 
      FROM sangrias_bolinha s 
      JOIN estabelecimentos e ON s.estabelecimento_id = e.id
      WHERE s.id = $1 AND UPPER(e.produto) LIKE '%BOLINHAS%'
    `;

    const result = await connection.query(query, [id]);
    return result.rows;
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
      observacoes
    } = sangria;

    const query = `
      UPDATE sangrias_bolinha 
      SET 
        estabelecimento_id = $1,
        data_sangria = $2,
        valor_apurado = $3,
        comissao = $4,
        valor_comerciante = $5,
        valor_liquido = $6,
        tipo_pagamento = $7,
        observacoes = $8,
        data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $9 
      AND estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%BOLINHAS%'
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
      id
    ]);

    return result;
  };

  deleteSangria = async id => {
    const query = `
      DELETE FROM sangrias_bolinha 
      WHERE id = $1 
      AND estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%BOLINHAS%'
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
      FROM sangrias_bolinha 
      WHERE estabelecimento_id IN (
        SELECT id FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%BOLINHAS%'
      )
      GROUP BY ano, mes
      ORDER BY ano, mes
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getEstabelecimentos = async () => {
    const query = `
      SELECT * FROM estabelecimentos 
      WHERE UPPER(produto) LIKE '%BOLINHAS%' 
      AND status = 'ativo'
    `;

    const result = await connection.query(query);
    return result.rows;
  };

  getControleGeral = async () => {
    const query = `
      SELECT 
        e.id, 
        e.estabelecimento, 
        e.chave, 
        e.maquina, 
        e.endereco, 
        e.bairro,
        e.telefone_contato,
        MAX(s.data_sangria) AS data 
      FROM estabelecimentos e 
      JOIN sangrias_bolinha s 
        ON e.id = s.estabelecimento_id 
      WHERE UPPER(e.produto) LIKE '%BOLINHAS%'
      GROUP BY 
        e.id, e.estabelecimento, e.chave, e.maquina, e.endereco, e.bairro, e.telefone_contato
    `;

    const result = await connection.query(query);
    return result.rows;
  };
}

export default new BolinhasModel();
