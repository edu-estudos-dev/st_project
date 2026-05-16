import connection from '../db_config/connection.js';

class PeluciasModel {
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
      throw new Error(
        'Estabelecimento de pelúcias não encontrado para este assinante.'
      );
    }

    return result;
  };

  getUltimoEstoque = async (estabelecimentoId, assinanteId) => {
    const dados = await this.getUltimosDados(estabelecimentoId, assinanteId);
    return { estoque: dados.estoque || 0 };
  };

  getUltimaLeitura = async (estabelecimentoId, assinanteId) => {
    const dados = await this.getUltimosDados(estabelecimentoId, assinanteId);
    return { ultima_leitura: dados.ultima_leitura || 0 };
  };

  getUltimosDados = async (estabelecimentoId, assinanteId) => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      WITH ultimo_registro AS (
        SELECT
          sp.leitura_atual AS ultima_leitura,
          sp.estoque,
          false AS origem_cadastro_inicial
        FROM sangrias_pelucias sp
        WHERE sp.estabelecimento_id = $1
          AND sp.assinante_id = $2
        ORDER BY sp.data_sangria DESC, sp.id DESC
        LIMIT 1
      ),
      cadastro_inicial AS (
        SELECT
          e.pelucia_leitura_inicial AS ultima_leitura,
          e.pelucia_abastecido_inicial AS estoque,
          true AS origem_cadastro_inicial
        FROM estabelecimentos e
        WHERE e.id = $1
          AND e.assinante_id = $2
          AND e.status = 'ativo'
          AND UPPER(e.produto) LIKE '%PELUCIAS%'
          AND e.pelucia_leitura_inicial IS NOT NULL
          AND e.pelucia_abastecido_inicial IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM ultimo_registro)
      )
      SELECT *
      FROM ultimo_registro

      UNION ALL

      SELECT *
      FROM cadastro_inicial
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId
    ]);

    return (
      result.rows[0] || {
        ultima_leitura: 0,
        estoque: 0,
        origem_cadastro_inicial: false
      }
    );
  };

  getSangrias = async assinanteId => {
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

  getEstabelecimentos = async assinanteId => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      SELECT *
      FROM estabelecimentos
      WHERE assinante_id = $1
        AND UPPER(produto) LIKE '%PELUCIAS%'
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
      throw new Error(
        'Sangria de pelúcias não encontrada para este assinante.'
      );
    }

    return result;
  };

  deleteSangria = async (id, assinanteId) => {
    const query = `
      DELETE FROM sangrias_pelucias
      WHERE id = $1
        AND assinante_id = $2
        AND NOT EXISTS (
          SELECT 1
          FROM visita_produtos
          WHERE sangria_id = $1
            AND assinante_id = $2
            AND produto = 'PELUCIAS'
        )
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

  getMonthlyRevenue = async assinanteId => {
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

  getControleGeral = async assinanteId => {
    const query = `
      SELECT
        e.id,
        e.estabelecimento,
        e.chave,
        e.maquina,
        e.endereco,
        e.bairro,
        MAX(sp.data_sangria) AS data
      FROM estabelecimentos e
      LEFT JOIN sangrias_pelucias sp
        ON e.id = sp.estabelecimento_id
       AND e.assinante_id = sp.assinante_id
      WHERE e.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
        AND e.status = 'ativo'
      GROUP BY
        e.id,
        e.estabelecimento,
        e.chave,
        e.maquina,
        e.endereco,
        e.bairro
      ORDER BY e.bairro ASC, e.estabelecimento ASC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getControleGeralPelucias = async assinanteId => {
    return this.getControleGeral(assinanteId);
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

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId
    ]);

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

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId
    ]);

    return result.rows[0] || { data_sangria: '1970-01-01' };
  };

  hasSangria = async (estabelecimentoId, assinanteId) => {
    await this.ensureEstabelecimentoInitialColumns();

    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM sangrias_pelucias sp
        WHERE sp.estabelecimento_id = $1
          AND sp.assinante_id = $2
      ) OR EXISTS (
        SELECT 1
        FROM estabelecimentos e
        WHERE e.id = $1
          AND e.assinante_id = $2
          AND e.status = 'ativo'
          AND UPPER(e.produto) LIKE '%PELUCIAS%'
          AND e.pelucia_leitura_inicial IS NOT NULL
          AND e.pelucia_abastecido_inicial IS NOT NULL
      ) AS has_historico
    `;

    const result = await connection.query(query, [
      estabelecimentoId,
      assinanteId
    ]);

    return Boolean(result.rows[0]?.has_historico);
  };

  getAllSangrias = async assinanteId => {
    const query = `
      SELECT
        sp.id,
        e.estabelecimento,
        e.endereco,
        e.bairro,
        e.maquina,
        sp.data_sangria AS data,
        sp.leitura_atual,
        sp.ultima_leitura,
        sp.abastecido,
        sp.estoque,
        sp.observacoes
      FROM sangrias_pelucias sp
      JOIN estabelecimentos e
        ON sp.estabelecimento_id = e.id
       AND sp.assinante_id = e.assinante_id
      WHERE sp.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
      ORDER BY sp.data_sangria DESC, sp.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  getLatestSangriaForAllEstabelecimentos = async assinanteId => {
    const query = `
      SELECT
        e.estabelecimento,
        e.endereco,
        e.bairro,
        e.telefone_contato,
        e.maquina,
        ultima.id,
        ultima.data_sangria AS data,
        ultima.leitura_atual,
        ultima.ultima_leitura,
        ultima.abastecido,
        ultima.estoque,
        ultima.observacoes
      FROM estabelecimentos e
      JOIN LATERAL (
        SELECT
          sp.id,
          sp.data_sangria,
          sp.leitura_atual,
          sp.ultima_leitura,
          sp.abastecido,
          sp.estoque,
          sp.observacoes
        FROM sangrias_pelucias sp
        WHERE sp.estabelecimento_id = e.id
          AND sp.assinante_id = e.assinante_id
        ORDER BY sp.data_sangria DESC, sp.id DESC
        LIMIT 1
      ) ultima ON TRUE
      WHERE e.assinante_id = $1
        AND UPPER(e.produto) LIKE '%PELUCIAS%'
      ORDER BY ultima.data_sangria DESC, ultima.id DESC
    `;

    const result = await connection.query(query, [assinanteId]);
    return result.rows;
  };

  updatePixConfirmado = async ({ id, assinante_id, pix_confirmado }) => {
    const query = `
      UPDATE sangrias_pelucias s
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
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
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
        'Sangria de pelúcias não encontrada para este assinante.'
      );
    }

    return result.rows[0];
  };
}

export default new PeluciasModel();
