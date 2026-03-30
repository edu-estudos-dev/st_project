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

    if (
      estabelecimento_id === undefined ||
      data_sangria === undefined ||
      valor_apurado === undefined ||
      comissao === undefined ||
      valor_comerciante === undefined ||
      valor_liquido === undefined ||
      tipo_pagamento === undefined ||
      observacoes === undefined ||
      leitura_atual === undefined
    ) {
      throw new Error('Parâmetros obrigatórios não podem ser undefined');
    }

    const query = `
        INSERT INTO sangrias_pelucias (
            estabelecimento_id,
            data_sangria, valor_apurado,
            comissao, valor_comerciante,
            valor_liquido, tipo_pagamento,
            observacoes,
            leitura_atual,
            ultima_leitura,
            abastecido,
            qtde_vendido,
            estoque)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    try {
      const [result] = await connection.execute(query, [
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
    } catch (error) {
      console.error('Erro ao criar sangria:', error);
      throw error;
    }
  };

  getUltimoEstoque = async estabelecimentoId => {
    const query = `
            SELECT estoque
            FROM sangrias_pelucias
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC
            LIMIT 1
        `;

    try {
      const [results] = await connection.execute(query, [estabelecimentoId]);
      return results[0] || { estoque: 0 };
    } catch (error) {
      console.error('Erro ao buscar o último estoque:', error);
      throw error;
    }
  };

  getUltimaLeitura = async estabelecimentoId => {
    const query = `
            SELECT leitura_atual AS ultima_leitura
            FROM sangrias_pelucias
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC
            LIMIT 1
        `;

    try {
      const [results] = await connection.execute(query, [estabelecimentoId]);
      return results[0] || { ultima_leitura: 0 };
    } catch (error) {
      console.error('Erro ao buscar a última leitura:', error);
      throw error;
    }
  };

  getUltimosDados = async estabelecimentoId => {
    const query = `
            SELECT leitura_atual AS ultima_leitura, estoque
            FROM sangrias_pelucias
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC
            LIMIT 1
        `;

    try {
      const [results] = await connection.execute(query, [estabelecimentoId]);
      return results[0] || { ultima_leitura: 0, estoque: 0 };
    } catch (error) {
      console.error('Erro ao buscar os últimos dados:', error);
      throw error;
    }
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

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error('Erro ao buscar sangrias:', error);
      throw error;
    }
  };

  getEstabelecimentos = async () => {
    const query = `
        SELECT * FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%' AND status = 'ativo'`;

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
      throw error;
    }
  };

  getSangriaById = async id => {
    const query = `
            SELECT s.*, e.estabelecimento
            FROM sangrias_pelucias s
            JOIN estabelecimentos e ON s.estabelecimento_id = e.id
            WHERE s.id = ? AND UPPER(e.produto) LIKE '%PELUCIAS%'
        `;

    try {
      const [results] = await connection.execute(query, [id]);
      return results.length ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar sangria por ID:', error);
      throw error;
    }
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
        estabelecimento_id = ?,
        data_sangria = ?,
        valor_apurado = ?,
        comissao = ?,
        valor_comerciante = ?,
        valor_liquido = ?,
        tipo_pagamento = ?,
        observacoes = ?,
        leitura_atual = ?,
        abastecido = ?,
        qtde_vendido = ?,
        data_atualizacao = NOW() -- 🔥 ESSENCIAL
    WHERE id = ?
        AND estabelecimento_id IN (
            SELECT id FROM estabelecimentos 
            WHERE UPPER(produto) LIKE '%PELUCIAS%'
        )
    `;

    try {
      const [result] = await connection.execute(query, [
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
    } catch (error) {
      console.error('Erro ao atualizar sangria:', error);
      throw error;
    }
  };
  deleteSangria = async id => {
    const query = `
        DELETE FROM sangrias_pelucias
        WHERE id = ?
        AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%')
    `;

    try {
      const [result] = await connection.execute(query, [id]);
      return result;
    } catch (error) {
      console.error('Erro ao deletar sangria:', error);
      throw error;
    }
  };

  getMonthlyRevenue = async () => {
    const query = `
            SELECT
                YEAR(data_sangria) AS ano,
                MONTH(data_sangria) AS mes,
                SUM(valor_liquido) AS total
            FROM
                sangrias_pelucias
            WHERE estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%')
            GROUP BY
                YEAR(data_sangria), MONTH(data_sangria)
            ORDER BY
                YEAR(data_sangria), MONTH(data_sangria)
        `;

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error('Erro ao obter receita mensal:', error);
      throw error;
    }
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
            FROM
                estabelecimentos e
            JOIN
                sangrias_pelucias sp
            ON
                e.id = sp.estabelecimento_id
            WHERE
                UPPER(e.produto) LIKE '%PELUCIAS%'
            ORDER BY
                sp.data_sangria DESC, sp.id DESC
        `;

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error(
        'Erro ao buscar dados de controle geral das pelúcias:',
        error
      );
      throw error;
    }
  };

  getUltimaSangria = async estabelecimentoId => {
    const query = `
            SELECT *
            FROM sangrias_pelucias
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC
            LIMIT 1
        `;

    try {
      const [results] = await connection.execute(query, [estabelecimentoId]);
      return results;
    } catch (error) {
      console.error('Erro ao buscar a última sangria:', error);
      throw error;
    }
  };

  getUltimaDataSangria = async estabelecimentoId => {
    const query = `
            SELECT data_sangria
            FROM sangrias_pelucias
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC
            LIMIT 1
        `;

    try {
      const [results] = await connection.execute(query, [estabelecimentoId]);
      return results[0] || { data_sangria: '1970-01-01' };
    } catch (error) {
      console.error('Erro ao buscar a data da última sangria:', error);
      throw error;
    }
  };

  getAllSangrias = async () => {
    const query = `
            SELECT sp.id, e.estabelecimento,
                sp.data_sangria AS data,
                sp.leitura_atual,
                sp.ultima_leitura,
                sp.abastecido,
                sp.observacoes
            FROM
                sangrias_pelucias sp
            JOIN
                estabelecimentos e ON sp.estabelecimento_id = e.id
            ORDER BY
                sp.data_sangria DESC, sp.id DESC;
        `;

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error('Erro ao buscar todas as sangrias:', error);
      throw error;
    }
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
            FROM
                estabelecimentos e
            JOIN
                sangrias_pelucias sp
            ON
                e.id = sp.estabelecimento_id
            WHERE
                UPPER(e.produto) LIKE '%PELUCIAS%'
            AND sp.data_sangria = (
                SELECT MAX(inner_sp.data_sangria)
                FROM sangrias_pelucias inner_sp
                WHERE inner_sp.estabelecimento_id = e.id
            )
            ORDER BY
                sp.data_sangria DESC, sp.id DESC
        `;

    try {
      const [results] = await connection.execute(query);
      return results;
    } catch (error) {
      console.error('Erro ao buscar dados mais recentes:', error);
      throw error;
    }
  };
}

export default new PeluciasModel();
