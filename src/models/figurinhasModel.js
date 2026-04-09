import connection from '../db_config/connection.js';

class FigurinhasModel {
  createSangria = async sangria => {
    const {
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
        INSERT INTO sangrias_figurinhas (
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
      observacoes
    ]);

    return result;
  };

  getSangrias = async () => {
    const query = `
        SELECT s.*, e.estabelecimento 
        FROM sangrias_figurinhas s 
        JOIN estabelecimentos e ON s.estabelecimento_id = e.id
        WHERE UPPER(e.produto) LIKE '%FIGURINHAS%'
        AND COALESCE(s.observacoes, '') NOT LIKE '[ABERTURA INICIAL]%'
        ORDER BY s.data_sangria DESC
    `;
    const result = await connection.query(query);
    return result.rows;
  };

  getEstabelecimentos = async () => {
    const query = `
        SELECT * FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%FIGURINHAS%' 
        AND status = 'ativo'
    `;
    const result = await connection.query(query);
    return result.rows;
  };

  getSangriaById = async id => {
    const query = `
    SELECT 
      s.*,
      e.estabelecimento,
      prev.data_sangria AS data_sangria_anterior,
      prev.qtde_deixada AS qtde_anterior,
      prev.observacoes AS observacoes_anteriores
    FROM sangrias_figurinhas s
    JOIN estabelecimentos e 
      ON s.estabelecimento_id = e.id
    LEFT JOIN sangrias_figurinhas prev 
      ON prev.estabelecimento_id = s.estabelecimento_id
      AND prev.data_sangria < s.data_sangria
    WHERE s.id = $1
    AND UPPER(e.produto) LIKE '%FIGURINHAS%'
    ORDER BY prev.data_sangria DESC
    LIMIT 1
  `;

    const result = await connection.query(query, [id]);
    return result.rows.length ? result.rows[0] : null;
  };

  updateSangria = async sangria => {
    const {
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
    UPDATE sangrias_figurinhas 
    SET
      estabelecimento_id = $1,
      data_sangria = $2,
      qtde_deixada = $3,
      abastecido = $4,
      estoque = $5,
      qtde_vendido = $6,
      valor_apurado = $7,
      tipo_pagamento = $8,
      observacoes = $9,
      data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = $10
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
      id
    ]);

    return result;
  };

  deleteSangria = async id => {
    const query = `
        DELETE FROM sangrias_figurinhas 
        WHERE id = $1
        AND estabelecimento_id IN (
            SELECT id FROM estabelecimentos 
            WHERE UPPER(produto) LIKE '%FIGURINHAS%'
        )
    `;
    const result = await connection.query(query, [id]);
    return result;
  };

  getUltimaSangria = async estabelecimentoId => {
    const query = `
        SELECT * FROM sangrias_figurinhas 
        WHERE estabelecimento_id = $1 
        ORDER BY data_sangria DESC 
        LIMIT 1
    `;
    const result = await connection.query(query, [estabelecimentoId]);
    return result.rows;
  };

  getMonthlyRevenue = async () => {
    const query = `
        SELECT 
            EXTRACT(YEAR FROM data_sangria) AS ano,
            EXTRACT(MONTH FROM data_sangria) AS mes,
            SUM(valor_apurado) AS total
        FROM sangrias_figurinhas
        WHERE estabelecimento_id IN (
            SELECT id FROM estabelecimentos 
            WHERE UPPER(produto) LIKE '%FIGURINHAS%'
        )
        GROUP BY ano, mes
        ORDER BY ano, mes
    `;
    const result = await connection.query(query);
    return result.rows;
  };

  getLatestSangriaForAllEstabelecimentos = async () => {
    const query = `
        SELECT 
            sf.id,
            e.estabelecimento,
            e.endereco,
            e.bairro,
            e.telefone_contato,
            sf.data_sangria,
            sf.abastecido,
            sf.estoque,
            e.maquina,
            sf.observacoes
        FROM estabelecimentos e
        JOIN sangrias_figurinhas sf 
        ON e.id = sf.estabelecimento_id
        WHERE UPPER(e.produto) LIKE '%FIGURINHAS%'
        AND sf.data_sangria = (
            SELECT MAX(inner_sf.data_sangria)
            FROM sangrias_figurinhas inner_sf
            WHERE inner_sf.estabelecimento_id = e.id
        )
        ORDER BY sf.data_sangria DESC
    `;
    const result = await connection.query(query);
    return result.rows;
  };
}

export default new FigurinhasModel();
