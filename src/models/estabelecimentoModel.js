import connection from '../db_config/connection.js';
import { hasProduto } from '../utilities/produtoUtils.js';

class EstabelecimentoModel {
  ensureCoordinatesColumns = async () => {
    try {
      const SQL = `
        ALTER TABLE estabelecimentos
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
      `;

      await connection.query(SQL);
    } catch (error) {
      console.error('Erro ao garantir colunas de coordenadas:', error);
      throw new Error('Erro ao preparar coordenadas dos estabelecimentos.');
    }
  };

  findAll = async () => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL = 'SELECT * FROM estabelecimentos WHERE status = $1';
      const result = await connection.query(SQL, ['ativo']);
      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query:', error);
      throw new Error('Erro ao buscar estabelecimentos ativos.');
    }
  };

  search = async query => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL = `
                SELECT * FROM estabelecimentos 
                WHERE (estabelecimento ILIKE $1 OR responsavel_nome ILIKE $2 OR bairro ILIKE $3) 
                AND status = $4
            `;
      const result = await connection.query(SQL, [
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        'ativo'
      ]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query de busca:', error);
      throw new Error('Erro ao buscar estabelecimentos.');
    }
  };

  create = async ({
    estabelecimento,
    produto,
    chave,
    maquina,
    endereco,
    bairro,
    responsavel_nome,
    telefone_contato,
    observacoes,
    latitude,
    longitude
  }) => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL = `INSERT INTO estabelecimentos 
                        (estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, latitude, longitude, data_criacao, status) 
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`;

      const dateISO = new Date();

      await connection.query(SQL, [
        estabelecimento,
        produto,
        chave,
        maquina,
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
    } catch (error) {
      console.error('Erro ao criar novo estabelecimento:', error);
      throw new Error('Erro ao criar novo estabelecimento.');
    }
  };

  update = async (
    id,
    {
      estabelecimento,
      produto,
      chave,
      maquina,
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes,
      latitude,
      longitude
    }
  ) => {
    await this.ensureCoordinatesColumns();
    const sql = `UPDATE estabelecimentos SET
            estabelecimento = $1,
            produto = $2,
            chave = $3,
            maquina = $4,
            endereco = $5,
            bairro = $6,
            responsavel_nome = $7,
            telefone_contato = $8,
            observacoes = $9,
            latitude = $10,
            longitude = $11,
            data_atualizacao = $12 WHERE id = $13`;

    const dateISO = new Date();

    const result = await connection.query(sql, [
      estabelecimento,
      produto,
      chave,
      maquina,
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes,
      latitude,
      longitude,
      dateISO,
      id
    ]);

    return result;
  };

  findById = async id => {
    await this.ensureCoordinatesColumns();
    const sql = 'SELECT * FROM estabelecimentos WHERE id = $1';
    const result = await connection.query(sql, [id]);
    return result.rows[0];
  };

  destroy = async id => {
    try {
      const sql =
        'UPDATE estabelecimentos SET status = $1, data_encerramento = $2 WHERE id = $3';
      const dataEncerramento = new Date();

      const result = await connection.query(sql, [
        'inativo',
        dataEncerramento,
        id
      ]);
      console.log('Estabelecimento marcado como inativo:', result);
    } catch (error) {
      console.error('Erro ao deletar o estabelecimento:', error);
      throw new Error('Erro ao deletar o estabelecimento.');
    }
  };

  getBairrosByProduto = async produto => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL =
        'SELECT DISTINCT bairro FROM estabelecimentos WHERE UPPER(produto) LIKE $1 AND status = $2';
      const result = await connection.query(SQL, [
        `%${produto.toUpperCase()}%`,
        'ativo'
      ]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Erro ao buscar bairros.');
    }
  };

  getRouteBairros = async () => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL = `
        SELECT DISTINCT bairro
        FROM estabelecimentos
        WHERE status = 'ativo'
          AND COALESCE(TRIM(bairro), '') <> ''
        ORDER BY bairro ASC
      `;

      const result = await connection.query(SQL);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bairros para rotas:', error);
      return [];
    }
  };

  getRoutePoints = async ({ bairro, produto = 'todos' }) => {
    try {
      await this.ensureCoordinatesColumns();
      const params = ['ativo', bairro];
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
          latitude,
          longitude
        FROM estabelecimentos
        WHERE status = $1
          AND bairro = $2
          ${productFilter}
        ORDER BY estabelecimento ASC
      `;

      const result = await connection.query(SQL, params);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar pontos para rota:', error);
      return [];
    }
  };

  getMenuProdutosDisponiveis = async () => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL =
        "SELECT produto FROM estabelecimentos WHERE status = $1 AND produto IS NOT NULL AND produto <> ''";
      const result = await connection.query(SQL, ['ativo']);

      const disponibilidade = {
        bolinhas: false,
        figurinhas: false,
        pelucias: false
      };

      for (const row of result.rows) {
        if (!disponibilidade.bolinhas && hasProduto(row.produto, 'BOLINHAS')) {
          disponibilidade.bolinhas = true;
        }

        if (
          !disponibilidade.figurinhas &&
          hasProduto(row.produto, 'FIGURINHAS')
        ) {
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
      console.error(
        'Erro ao carregar produtos disponíveis para o menu:',
        error
      );
      return {
        bolinhas: true,
        figurinhas: true,
        pelucias: true,
        hasAny: true
      };
    }
  };

  getDashboardSummary = async () => {
    try {
      await this.ensureCoordinatesColumns();
      const SQL = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'ativo') AS total_ativos,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%BOLINHAS%') AS bolinhas_ativas,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%FIGURINHAS%') AS figurinhas_ativas,
          COUNT(*) FILTER (WHERE status = 'ativo' AND UPPER(produto) LIKE '%PELUCIAS%') AS pelucias_ativas
        FROM estabelecimentos
      `;

      const result = await connection.query(SQL);
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

  getOperationalPendingItems = async (staleDays = 7, limit = 6) => {
    try {
      await this.ensureCoordinatesColumns();
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
            ORDER BY sb.data_sangria DESC, sb.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            e.id AS estabelecimento_id,
            e.estabelecimento,
            'Figurinhas' AS produto,
            '/figurinhas/sangrias/add' AS action_href,
            latest.data_sangria AS ultima_movimentacao,
            CURRENT_DATE - latest.data_sangria::date AS dias_sem_registro
          FROM estabelecimentos e
          LEFT JOIN LATERAL (
            SELECT sf.data_sangria
            FROM sangrias_figurinhas sf
            WHERE sf.estabelecimento_id = e.id
            ORDER BY sf.data_sangria DESC, sf.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
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
            ORDER BY sp.data_sangria DESC, sp.id DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE e.status = 'ativo'
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
           OR dias_sem_registro > $1
        ORDER BY
          CASE WHEN ultima_movimentacao IS NULL THEN 0 ELSE 1 END,
          dias_sem_registro DESC,
          estabelecimento ASC
        LIMIT $2
      `;

      const result = await connection.query(SQL, [staleDays, limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao carregar pendencias operacionais do dashboard:', error);
      return [];
    }
  };

  getRecentOperationalMovements = async (limit = 6) => {
    try {
      await this.ensureCoordinatesColumns();
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
          JOIN estabelecimentos e ON e.id = sb.estabelecimento_id
          WHERE e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%BOLINHAS%'

          UNION ALL

          SELECT
            sf.id,
            'operacional' AS origem,
            'Figurinhas' AS produto,
            e.estabelecimento,
            sf.data_sangria::timestamp AS data_movimentacao,
            '/figurinhas/sangrias/view/' || sf.id AS href,
            COALESCE(sf.valor_apurado, 0) AS valor,
            'Coleta registrada' AS descricao
          FROM sangrias_figurinhas sf
          JOIN estabelecimentos e ON e.id = sf.estabelecimento_id
          WHERE e.status = 'ativo'
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
          JOIN estabelecimentos e ON e.id = sp.estabelecimento_id
          WHERE e.status = 'ativo'
            AND UPPER(e.produto) LIKE '%PELUCIAS%'
            AND sp.valor_apurado <> 0
        ) recent_movements
        ORDER BY data_movimentacao DESC, id DESC
        LIMIT $1
      `;

      const result = await connection.query(SQL, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao carregar ultimas movimentacoes operacionais:', error);
      return [];
    }
  };
}

export default new EstabelecimentoModel();
