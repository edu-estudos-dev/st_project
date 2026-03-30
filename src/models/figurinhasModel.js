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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const [result] = await connection.execute(query, [
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
        ORDER BY s.data_sangria DESC
        `;
    const [results] = await connection.execute(query);
    return results;
  };

  getEstabelecimentos = async () => {
    const query = `
        SELECT * FROM estabelecimentos 
        WHERE UPPER(produto) LIKE '%FIGURINHAS%' 
        AND status = 'ativo'
        `;
    const [results] = await connection.execute(query);
    return results;
  };

  getSangriaById = async id => {
    const query = `
    SELECT 
      s.*,
      e.estabelecimento,

      -- 🔥 DADOS DA SANGRIA ANTERIOR
      prev.data_sangria AS data_sangria_anterior,
      prev.qtde_deixada AS qtde_anterior,
      prev.observacoes AS observacoes_anteriores

    FROM sangrias_figurinhas s
    JOIN estabelecimentos e 
      ON s.estabelecimento_id = e.id

    LEFT JOIN sangrias_figurinhas prev 
      ON prev.estabelecimento_id = s.estabelecimento_id
      AND prev.data_sangria < s.data_sangria

    WHERE s.id = ?
    AND UPPER(e.produto) LIKE '%FIGURINHAS%'

    ORDER BY prev.data_sangria DESC
    LIMIT 1
  `;

    const [results] = await connection.execute(query, [id]);
    return results.length ? results[0] : null;
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
      estabelecimento_id = ?,
      data_sangria = ?,
      qtde_deixada = ?,
      abastecido = ?,
      estoque = ?,
      qtde_vendido = ?,
      valor_apurado = ?,
      tipo_pagamento = ?,
      observacoes = ?,
      data_atualizacao = NOW() -- 🔥 AQUI A CORREÇÃO
    WHERE id = ?
  `;

    const [result] = await connection.execute(query, [
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
        WHERE id = ?
        AND estabelecimento_id IN (
            SELECT id FROM estabelecimentos 
            WHERE UPPER(produto) LIKE '%FIGURINHAS%'
        )
        `;
    const [result] = await connection.execute(query, [id]);
    return result;
  };

  getUltimaSangria = async estabelecimentoId => {
    const query = `
        SELECT * FROM sangrias_figurinhas 
        WHERE estabelecimento_id = ? 
        ORDER BY data_sangria DESC 
        LIMIT 1
        `;
    const [results] = await connection.execute(query, [estabelecimentoId]);
    return results;
  };

  getMonthlyRevenue = async () => {
    const query = `
        SELECT 
            YEAR(data_sangria) AS ano,
            MONTH(data_sangria) AS mes,
            SUM(valor_apurado) AS total
        FROM sangrias_figurinhas
        WHERE estabelecimento_id IN (
            SELECT id FROM estabelecimentos 
            WHERE UPPER(produto) LIKE '%FIGURINHAS%'
        )
        GROUP BY ano, mes
        ORDER BY ano, mes
        `;
    const [results] = await connection.execute(query);
    return results;
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
    const [results] = await connection.execute(query);
    return results;
  };
}

export default new FigurinhasModel();
