import connection from '../db_config/connection.js';
import { hasProduto } from '../utilities/produtoUtils.js';

class EstabelecimentoModel {
  ensureEstabelecimentoColumns = async () => {
    try {
      const SQL = `
        ALTER TABLE estabelecimentos
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS chave_bolinhas VARCHAR(100),
        ADD COLUMN IF NOT EXISTS maquina_bolinhas VARCHAR(100),
        ADD COLUMN IF NOT EXISTS chave_pelucias VARCHAR(100),
        ADD COLUMN IF NOT EXISTS maquina_pelucias VARCHAR(100)
      `;

      await connection.query(SQL);
    } catch (error) {
      console.error('Erro ao garantir colunas extras dos estabelecimentos:', error);
      throw new Error('Erro ao preparar colunas dos estabelecimentos.');
    }
  };

  ensureCoordinatesColumns = async () => {
    await this.ensureEstabelecimentoColumns();
  };

  findAll = async (assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT *
        FROM estabelecimentos
        WHERE status = $1
          AND assinante_id = $2
      `;

      const result = await connection.query(SQL, ['ativo', assinanteId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query:', error);
      throw new Error('Erro ao buscar estabelecimentos ativos.');
    }
  };

  search = async (query, assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT *
        FROM estabelecimentos
        WHERE (estabelecimento ILIKE $1 OR responsavel_nome ILIKE $2 OR bairro ILIKE $3)
          AND status = $4
          AND assinante_id = $5
      `;

      const result = await connection.query(SQL, [
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        'ativo',
        assinanteId
      ]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query de busca:', error);
      throw new Error('Erro ao buscar estabelecimentos.');
    }
  };

  create = async ({
    assinante_id,
    estabelecimento,
    produto,
    chave,
    maquina,
    chave_bolinhas,
    maquina_bolinhas,
    chave_pelucias,
    maquina_pelucias,
    endereco,
    bairro,
    responsavel_nome,
    telefone_contato,
    observacoes,
    latitude,
    longitude
  }) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        INSERT INTO estabelecimentos (
          assinante_id,
          estabelecimento,
          produto,
          chave,
          maquina,
          chave_bolinhas,
          maquina_bolinhas,
          chave_pelucias,
          maquina_pelucias,
          endereco,
          bairro,
          responsavel_nome,
          telefone_contato,
          observacoes,
          latitude,
          longitude,
          data_criacao,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id
      `;

      const dateISO = new Date();

      const result = await connection.query(SQL, [
        assinante_id,
        estabelecimento,
        produto,
        chave || '',
        maquina || '',
        chave_bolinhas || '',
        maquina_bolinhas || '',
        chave_pelucias || '',
        maquina_pelucias || '',
        endereco,
        bairro,
        responsavel_nome,
        telefone_contato,
        observacoes,
        latitude,
        longitude,
        dateISO,
        'ativo'
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar novo estabelecimento:', error);
      throw new Error('Erro ao criar novo estabelecimento.');
    }
  };

  update = async (
    assinanteId,
    id,
    {
      estabelecimento,
      produto,
      chave,
      maquina,
      chave_bolinhas,
      maquina_bolinhas,
      chave_pelucias,
      maquina_pelucias,
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes,
      latitude,
      longitude
    }
  ) => {
    await this.ensureEstabelecimentoColumns();

    const sql = `
      UPDATE estabelecimentos SET
        estabelecimento = $1,
        produto = $2,
        chave = $3,
        maquina = $4,
        chave_bolinhas = $5,
        maquina_bolinhas = $6,
        chave_pelucias = $7,
        maquina_pelucias = $8,
        endereco = $9,
        bairro = $10,
        responsavel_nome = $11,
        telefone_contato = $12,
        observacoes = $13,
        latitude = $14,
        longitude = $15,
        data_atualizacao = $16
      WHERE id = $17
        AND assinante_id = $18
    `;

    const dateISO = new Date();

    const result = await connection.query(sql, [
      estabelecimento,
      produto,
      chave || '',
      maquina || '',
      chave_bolinhas || '',
      maquina_bolinhas || '',
      chave_pelucias || '',
      maquina_pelucias || '',
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes,
      latitude,
      longitude,
      dateISO,
      id,
      assinanteId
    ]);

    return result;
  };

  findById = async (id, assinanteId) => {
    await this.ensureEstabelecimentoColumns();

    const sql = `
      SELECT *
      FROM estabelecimentos
      WHERE id = $1
        AND assinante_id = $2
    `;

    const result = await connection.query(sql, [id, assinanteId]);
    return result.rows[0];
  };

  destroy = async (id, assinanteId) => {
    try {
      const sql = `
        UPDATE estabelecimentos
        SET status = $1,
            data_encerramento = $2
        WHERE id = $3
          AND assinante_id = $4
      `;

      const dataEncerramento = new Date();

      const result = await connection.query(sql, [
        'inativo',
        dataEncerramento,
        id,
        assinanteId
      ]);

      console.log('Estabelecimento marcado como inativo:', result);
    } catch (error) {
      console.error('Erro ao deletar o estabelecimento:', error);
      throw new Error('Erro ao deletar o estabelecimento.');
    }
  };

  getBairrosByProduto = async (produto, assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT DISTINCT bairro
        FROM estabelecimentos
        WHERE UPPER(produto) LIKE $1
          AND status = $2
          AND assinante_id = $3
      `;

      const result = await connection.query(SQL, [
        `%${produto.toUpperCase()}%`,
        'ativo',
        assinanteId
      ]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Erro ao buscar bairros.');
    }
  };

  getRouteBairros = async (assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT DISTINCT bairro
        FROM estabelecimentos
        WHERE status = 'ativo'
          AND assinante_id = $1
          AND COALESCE(TRIM(bairro), '') <> ''
        ORDER BY bairro ASC
      `;

      const result = await connection.query(SQL, [assinanteId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bairros para rotas:', error);
      return [];
    }
  };

  getRoutePoints = async ({ bairro, bairros, produto = 'todos', assinanteId }) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const bairrosSelecionados = Array.isArray(bairros)
        ? bairros.map(item => String(item || '').trim()).filter(Boolean)
        : [String(bairro || '').trim()].filter(Boolean);

      if (!bairrosSelecionados.length) {
        return [];
      }

      const params = ['ativo', bairrosSelecionados, assinanteId];
      let productFilter = '';

      if (produto && produto !== 'todos') {
        params.push(`%${produto.toUpperCase()}%`);
        productFilter = `AND UPPER(produto) LIKE $${params.length}`;
      }

      const SQL = `
        SELECT
          id,
          estabelecimento,
          produto,
          endereco,
          bairro,
          responsavel_nome,
          telefone_contato,
          chave,
          maquina,
          chave_bolinhas,
          maquina_bolinhas,
          chave_pelucias,
          maquina_pelucias,
          latitude,
          longitude
        FROM estabelecimentos
        WHERE status = $1
          AND bairro = ANY($2)
          AND assinante_id = $3
          ${productFilter}
        ORDER BY bairro ASC, estabelecimento ASC
      `;

      const result = await connection.query(SQL, params);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar pontos para rota:', error);
      return [];
    }
  };

  getMenuProdutosDisponiveis = async (assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      await connection.query(`
        ALTER TABLE assinantes
        ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT
      `);

      const assinaturaResult = await connection.query(
        `
          SELECT produtos_habilitados
          FROM assinantes
          WHERE id = $1
          LIMIT 1
        `,
        [assinanteId]
      );

      const produtosHabilitados = assinaturaResult.rows[0]?.produtos_habilitados;

      const produtosConfigurados = {
        bolinhas: hasProduto(produtosHabilitados, 'BOLINHAS'),
        figurinhas: hasProduto(produtosHabilitados, 'FIGURINHAS'),
        pelucias: hasProduto(produtosHabilitados, 'PELUCIAS')
      };

      produtosConfigurados.hasAny =
        produtosConfigurados.bolinhas ||
        produtosConfigurados.figurinhas ||
        produtosConfigurados.pelucias;

      if (produtosConfigurados.hasAny) {
        return produtosConfigurados;
      }

      const SQL = `
        SELECT produto
        FROM estabelecimentos
        WHERE status = $1
          AND assinante_id = $2
          AND produto IS NOT NULL
          AND produto <> ''
      `;

      const result = await connection.query(SQL, ['ativo', assinanteId]);

      const disponibilidade = {
        bolinhas: false,
        figurinhas: false,
        pelucias: false
      };

      for (const row of result.rows) {
        if (!disponibilidade.bolinhas && hasProduto(row.produto, 'BOLINHAS')) {
          disponibilidade.bolinhas = true;
        }

        if (!disponibilidade.figurinhas && hasProduto(row.produto, 'FIGURINHAS')) {
          disponibilidade.figurinhas = true;
        }

        if (!disponibilidade.pelucias && hasProduto(row.produto, 'PELUCIAS')) {
          disponibilidade.pelucias = true;
        }
      }

      disponibilidade.hasAny =
        disponibilidade.bolinhas ||
        disponibilidade.figurinhas ||
        disponibilidade.pelucias;

      return disponibilidade;
    } catch (error) {
      console.error('Erro ao carregar produtos disponiveis para o menu:', error);

      return {
        bolinhas: true,
        figurinhas: true,
        pelucias: true,
        hasAny: true
      };
    }
  };

  getDashboardSummary = async (assinanteId) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'ativo') AS total_ativos,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%BOLINHAS%') AS bolinhas_ativas,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%FIGURINHAS%') AS figurinhas_ativas,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%PELUCIAS%') AS pelucias_ativas
        FROM estabelecimentos
        WHERE assinante_id = $1
      `;

      const result = await connection.query(SQL, [assinanteId]);
      const row = result.rows[0] || {};

      return {
        totalAtivos: Number(row.total_ativos || 0),
        bolinhasAtivas: Number(row.bolinhas_ativas || 0),
        figurinhasAtivas: Number(row.figurinhas_ativas || 0),
        peluciasAtivas: Number(row.pelucias_ativas || 0)
      };
    } catch (error) {
      console.error('Erro ao carregar resumo do dashboard:', error);

      return {
        totalAtivos: 0,
        bolinhasAtivas: 0,
        figurinhasAtivas: 0,
        peluciasAtivas: 0
      };
    }
  };

  getOperationalPendingItems = async (assinanteId, staleDays = 7, limit = 6) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        WITH operational_status AS (
          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Bolinhas' AS produto,
            '/bolinhas/sangrias/add' AS action_href,
            latest.data_sangria AS ultima_movimentacao,
            CURRENT_DATE - latest.data_sangria::date AS dias_sem_registro
          FROM estabelecimentos e
          LEFT JOIN LATERAL (
            SELECT sb.data_sangria
            FROM sangrias_bolinha sb
            WHERE sb.estabelecimento_id = e.id
              AND sb.assinante_id = e.assinante_id
            ORDER BY sb.data_sangria DESC, sb.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Consignados' AS produto,
            '/figurinhas/sangrias/add' AS action_href,
            latest.data_sangria AS ultima_movimentacao,
            CURRENT_DATE - latest.data_sangria::date AS dias_sem_registro
          FROM estabelecimentos e
          LEFT JOIN LATERAL (
            SELECT sf.data_sangria
            FROM sangrias_figurinhas sf
            WHERE sf.estabelecimento_id = e.id
              AND sf.assinante_id = e.assinante_id
            ORDER BY sf.data_sangria DESC, sf.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%FIGURINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Pelúcias' AS produto,
            '/pelucias/sangrias/add' AS action_href,
            latest.data_sangria AS ultima_movimentacao,
            CURRENT_DATE - latest.data_sangria::date AS dias_sem_registro
          FROM estabelecimentos e
          LEFT JOIN LATERAL (
            SELECT sp.data_sangria
            FROM sangrias_pelucias sp
            WHERE sp.estabelecimento_id = e.id
              AND sp.assinante_id = e.assinante_id
            ORDER BY sp.data_sangria DESC, sp.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
        )
        SELECT
          estabelecimento_id,
          estabelecimento,
          produto,
          action_href,
          ultima_movimentacao,
          COALESCE(dias_sem_registro, 9999) AS dias_sem_registro
        FROM operational_status
        WHERE ultima_movimentacao IS NULL
          OR dias_sem_registro > $2
        ORDER BY
          CASE WHEN ultima_movimentacao IS NULL THEN 0 ELSE 1 END,
          dias_sem_registro DESC,
          estabelecimento ASC
        LIMIT $3
      `;

      const result = await connection.query(SQL, [
        assinanteId,
        staleDays,
        limit
      ]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao carregar pendencias operacionais do dashboard:', error);
      return [];
    }
  };

  getRecentOperationalMovements = async (assinanteId, limit = 6) => {
    try {
      await this.ensureEstabelecimentoColumns();

      const SQL = `
        SELECT *
        FROM (
          SELECT
            sb.id,
            'operacional' AS origem,
            'Bolinhas' AS produto,
            e.estabelecimento,
            sb.data_sangria::timestamp AS data_movimentacao,
            '/bolinhas/sangrias/view/' || sb.id AS href,
            COALESCE(sb.valor_liquido, sb.valor_apurado, 0) AS valor,
            'Sangria registrada' AS descricao
          FROM sangrias_bolinha sb
          JOIN estabelecimentos e
            ON e.id = sb.estabelecimento_id
           AND e.assinante_id = sb.assinante_id
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            sf.id,
            'operacional' AS origem,
            'Consignados' AS produto,
            e.estabelecimento,
            sf.data_sangria::timestamp AS data_movimentacao,
            '/figurinhas/sangrias/view/' || sf.id AS href,
            COALESCE(sf.valor_apurado, 0) AS valor,
            'Coleta registrada' AS descricao
          FROM sangrias_figurinhas sf
          JOIN estabelecimentos e
            ON e.id = sf.estabelecimento_id
           AND e.assinante_id = sf.assinante_id
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%FIGURINHAS%'
            AND COALESCE(sf.observacoes, '') NOT LIKE '[ABERTURA INICIAL]%'

          UNION ALL

          SELECT
            sp.id,
            'operacional' AS origem,
            'Pelúcias' AS produto,
            e.estabelecimento,
            sp.data_sangria::timestamp AS data_movimentacao,
            '/pelucias/sangrias/view/' || sp.id AS href,
            COALESCE(sp.valor_liquido, sp.valor_apurado, 0) AS valor,
            'Sangria registrada' AS descricao
          FROM sangrias_pelucias sp
          JOIN estabelecimentos e
            ON e.id = sp.estabelecimento_id
           AND e.assinante_id = sp.assinante_id
          WHERE e.status = 'ativo'
            AND e.assinante_id = $1
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
            AND sp.valor_apurado <> 0
        ) recent_movements
        ORDER BY data_movimentacao DESC, id DESC
        LIMIT $2
      `;

      const result = await connection.query(SQL, [assinanteId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao carregar ultimas movimentacoes operacionais:', error);
      return [];
    }
  };
}

export default new EstabelecimentoModel();