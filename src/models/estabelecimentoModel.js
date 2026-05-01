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

  getDashboardInsights = async (assinanteId) => {
    const emptyInsights = {
      totals: {
        current: 0,
        previous: 0,
        delta: 0,
        deltaPercent: null,
        visits: 0,
        averagePerVisit: 0
      },
      productBreakdown: [],
      topPoints: [],
      pointTrends: [],
      staleValue: {
        totalEstimated: 0,
        items: []
      },
      cashFlow: {
        entradas: 0,
        saidas: 0,
        saldo: 0,
        pendenteSaidas: 0,
        pendenteCount: 0,
        atrasadoSaidas: 0,
        atrasadoCount: 0,
        comprometimentoPercent: null
      },
      recommendedAction: null
    };

    try {
      await this.ensureEstabelecimentoColumns();
      await connection.query(`
        ALTER TABLE lancamentos
        ADD COLUMN IF NOT EXISTS pago BOOLEAN NOT NULL DEFAULT FALSE
      `);

      const SQL = `
        WITH params AS (
          SELECT
            date_trunc('month', CURRENT_DATE)::date AS current_start,
            (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date AS previous_start,
            (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date AS next_start
        ),
        active_products AS (
          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Bolinhas' AS produto
          FROM estabelecimentos e
          WHERE e.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Consignados' AS produto
          FROM estabelecimentos e
          WHERE e.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%FIGURINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Pelúcias' AS produto
          FROM estabelecimentos e
          WHERE e.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
        ),
        movements AS (
          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Bolinhas' AS produto,
            sb.data_sangria::date AS data_movimentacao,
            COALESCE(sb.valor_liquido, sb.valor_apurado, 0)::numeric AS valor
          FROM sangrias_bolinha sb
          JOIN estabelecimentos e
            ON e.id = sb.estabelecimento_id
           AND e.assinante_id = sb.assinante_id
          WHERE sb.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Consignados' AS produto,
            sf.data_sangria::date AS data_movimentacao,
            COALESCE(sf.valor_apurado, 0)::numeric AS valor
          FROM sangrias_figurinhas sf
          JOIN estabelecimentos e
            ON e.id = sf.estabelecimento_id
           AND e.assinante_id = sf.assinante_id
          WHERE sf.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%FIGURINHAS%'
            AND COALESCE(sf.observacoes, '') NOT LIKE '[ABERTURA INICIAL]%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Pelúcias' AS produto,
            sp.data_sangria::date AS data_movimentacao,
            COALESCE(sp.valor_liquido, sp.valor_apurado, 0)::numeric AS valor
          FROM sangrias_pelucias sp
          JOIN estabelecimentos e
            ON e.id = sp.estabelecimento_id
           AND e.assinante_id = sp.assinante_id
          WHERE sp.assinante_id = $1
            AND e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
            AND sp.valor_apurado <> 0
        ),
        period_summary AS (
          SELECT
            COALESCE(SUM(valor) FILTER (
              WHERE data_movimentacao >= params.current_start
                AND data_movimentacao < params.next_start
            ), 0) AS current_total,
            COALESCE(SUM(valor) FILTER (
              WHERE data_movimentacao >= params.previous_start
                AND data_movimentacao < params.current_start
            ), 0) AS previous_total,
            COUNT(*) FILTER (
              WHERE data_movimentacao >= params.current_start
                AND data_movimentacao < params.next_start
            ) AS current_visits
          FROM movements, params
        ),
        product_current AS (
          SELECT
            produto,
            COALESCE(SUM(valor), 0) AS total,
            COUNT(*) AS visits
          FROM movements, params
          WHERE data_movimentacao >= params.current_start
            AND data_movimentacao < params.next_start
          GROUP BY produto
        ),
        top_points AS (
          SELECT
            estabelecimento_id,
            estabelecimento,
            COALESCE(SUM(valor), 0) AS total,
            COUNT(*) AS visits
          FROM movements, params
          WHERE data_movimentacao >= params.current_start
            AND data_movimentacao < params.next_start
          GROUP BY estabelecimento_id, estabelecimento
          ORDER BY total DESC, estabelecimento ASC
          LIMIT 5
        ),
        point_months AS (
          SELECT
            estabelecimento_id,
            estabelecimento,
            COALESCE(SUM(valor) FILTER (
              WHERE data_movimentacao >= params.current_start
                AND data_movimentacao < params.next_start
            ), 0) AS current_total,
            COALESCE(SUM(valor) FILTER (
              WHERE data_movimentacao >= params.previous_start
                AND data_movimentacao < params.current_start
            ), 0) AS previous_total
          FROM movements, params
          GROUP BY estabelecimento_id, estabelecimento
        ),
        point_trends AS (
          SELECT
            estabelecimento_id,
            estabelecimento,
            current_total,
            previous_total,
            current_total - previous_total AS delta,
            CASE
              WHEN previous_total > 0 THEN ROUND(((current_total - previous_total) / previous_total) * 100, 1)
              ELSE NULL
            END AS delta_percent
          FROM point_months
          WHERE previous_total > 0
            AND current_total <> previous_total
          ORDER BY ABS(current_total - previous_total) DESC, estabelecimento ASC
          LIMIT 6
        ),
        movement_profile AS (
          SELECT
            estabelecimento_id,
            produto,
            MAX(data_movimentacao) AS last_movement,
            COALESCE(SUM(valor), 0) AS total_value,
            COUNT(*) AS visits,
            GREATEST((CURRENT_DATE - MIN(data_movimentacao))::int, 1) AS active_days
          FROM movements
          GROUP BY estabelecimento_id, produto
        ),
        stale_items AS (
          SELECT
            ap.estabelecimento_id,
            ap.estabelecimento,
            ap.produto,
            mp.last_movement,
            COALESCE((CURRENT_DATE - mp.last_movement)::int, 9999) AS days_without_visit,
            COALESCE(mp.total_value / NULLIF(mp.active_days, 0), 0) AS average_daily,
            COALESCE((mp.total_value / NULLIF(mp.active_days, 0)) * GREATEST((CURRENT_DATE - mp.last_movement)::int, 0), 0) AS estimated_value
          FROM active_products ap
          LEFT JOIN movement_profile mp
            ON mp.estabelecimento_id = ap.estabelecimento_id
           AND mp.produto = ap.produto
          WHERE mp.last_movement IS NULL
             OR (CURRENT_DATE - mp.last_movement)::int >= 30
          ORDER BY estimated_value DESC, days_without_visit DESC, ap.estabelecimento ASC
          LIMIT 5
        ),
        financial_month AS (
          SELECT
            COALESCE(SUM(valor) FILTER (
              WHERE entrada_saida = 'Entrada'
                AND COALESCE(vencimento, data) >= params.current_start
                AND COALESCE(vencimento, data) < params.next_start
            ), 0) AS entradas,
            COALESCE(SUM(valor) FILTER (
              WHERE entrada_saida = 'Saida'
                AND COALESCE(vencimento, data) >= params.current_start
                AND COALESCE(vencimento, data) < params.next_start
            ), 0) AS saidas,
            COALESCE(SUM(valor) FILTER (
              WHERE entrada_saida = 'Saida'
                AND COALESCE(pago, FALSE) = FALSE
                AND COALESCE(vencimento, data) >= params.current_start
                AND COALESCE(vencimento, data) < params.next_start
            ), 0) AS pendente_saidas,
            COUNT(*) FILTER (
              WHERE entrada_saida = 'Saida'
                AND COALESCE(pago, FALSE) = FALSE
                AND COALESCE(vencimento, data) >= params.current_start
                AND COALESCE(vencimento, data) < params.next_start
            ) AS pendente_count,
            COALESCE(SUM(valor) FILTER (
              WHERE entrada_saida = 'Saida'
                AND COALESCE(pago, FALSE) = FALSE
                AND vencimento IS NOT NULL
                AND vencimento < CURRENT_DATE
            ), 0) AS atrasado_saidas,
            COUNT(*) FILTER (
              WHERE entrada_saida = 'Saida'
                AND COALESCE(pago, FALSE) = FALSE
                AND vencimento IS NOT NULL
                AND vencimento < CURRENT_DATE
            ) AS atrasado_count
          FROM lancamentos, params
          WHERE assinante_id = $1
        )
        SELECT
          (
            SELECT json_build_object(
              'current', current_total,
              'previous', previous_total,
              'visits', current_visits
            )
            FROM period_summary
          ) AS totals,
          COALESCE((
            SELECT json_agg(product_current ORDER BY total DESC, produto ASC)
            FROM product_current
          ), '[]'::json) AS product_breakdown,
          COALESCE((
            SELECT json_agg(top_points ORDER BY total DESC, estabelecimento ASC)
            FROM top_points
          ), '[]'::json) AS top_points,
          COALESCE((
            SELECT json_agg(point_trends ORDER BY ABS(delta) DESC, estabelecimento ASC)
            FROM point_trends
          ), '[]'::json) AS point_trends,
          COALESCE((
            SELECT json_agg(stale_items ORDER BY estimated_value DESC, days_without_visit DESC, estabelecimento ASC)
            FROM stale_items
          ), '[]'::json) AS stale_items,
          COALESCE((
            SELECT SUM(estimated_value)
            FROM stale_items
          ), 0) AS stale_estimated_total,
          (
            SELECT json_build_object(
              'entradas', entradas,
              'saidas', saidas,
              'saldo', entradas - saidas,
              'pendenteSaidas', pendente_saidas,
              'pendenteCount', pendente_count,
              'atrasadoSaidas', atrasado_saidas,
              'atrasadoCount', atrasado_count
            )
            FROM financial_month
          ) AS cash_flow
      `;

      const result = await connection.query(SQL, [assinanteId]);
      const row = result.rows[0] || {};
      const totals = row.totals || {};
      const current = Number(totals.current || 0);
      const previous = Number(totals.previous || 0);
      const visits = Number(totals.visits || 0);
      const delta = current - previous;

      const insights = {
        totals: {
          current,
          previous,
          delta,
          deltaPercent: previous > 0 ? (delta / previous) * 100 : null,
          visits,
          averagePerVisit: visits > 0 ? current / visits : 0
        },
        productBreakdown: (row.product_breakdown || []).map(item => ({
          produto: item.produto,
          total: Number(item.total || 0),
          visits: Number(item.visits || 0),
          percent: current > 0 ? (Number(item.total || 0) / current) * 100 : 0
        })),
        topPoints: (row.top_points || []).map(item => ({
          estabelecimentoId: item.estabelecimento_id,
          estabelecimento: item.estabelecimento,
          total: Number(item.total || 0),
          visits: Number(item.visits || 0)
        })),
        pointTrends: (row.point_trends || []).map(item => ({
          estabelecimentoId: item.estabelecimento_id,
          estabelecimento: item.estabelecimento,
          currentTotal: Number(item.current_total || 0),
          previousTotal: Number(item.previous_total || 0),
          delta: Number(item.delta || 0),
          deltaPercent:
            item.delta_percent === null || item.delta_percent === undefined
              ? null
              : Number(item.delta_percent)
        })),
        staleValue: {
          totalEstimated: Number(row.stale_estimated_total || 0),
          items: (row.stale_items || []).map(item => ({
            estabelecimentoId: item.estabelecimento_id,
            estabelecimento: item.estabelecimento,
            produto: item.produto,
            lastMovement: item.last_movement,
            daysWithoutVisit: Number(item.days_without_visit || 0),
            averageDaily: Number(item.average_daily || 0),
            estimatedValue: Number(item.estimated_value || 0)
          }))
        },
        cashFlow: {
          entradas: Number(row.cash_flow?.entradas || 0),
          saidas: Number(row.cash_flow?.saidas || 0),
          saldo: Number(row.cash_flow?.saldo || 0),
          pendenteSaidas: Number(row.cash_flow?.pendenteSaidas || 0),
          pendenteCount: Number(row.cash_flow?.pendenteCount || 0),
          atrasadoSaidas: Number(row.cash_flow?.atrasadoSaidas || 0),
          atrasadoCount: Number(row.cash_flow?.atrasadoCount || 0),
          comprometimentoPercent:
            Number(row.cash_flow?.entradas || 0) > 0
              ? (Number(row.cash_flow?.saidas || 0) / Number(row.cash_flow?.entradas || 0)) * 100
              : null
        },
        recommendedAction: null
      };

      insights.recommendedAction =
        insights.staleValue.items[0] ||
        insights.pointTrends.find(item => item.delta < 0) ||
        insights.topPoints[0] ||
        null;

      return insights;
    } catch (error) {
      console.error('Erro ao carregar insights do dashboard:', error);
      return emptyInsights;
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
