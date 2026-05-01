import connection from '../db_config/connection.js';

class VisitasModel {
  createOrGetVisitaEmAndamento = async ({
    rota_id = null,
    rota_ponto_id = null,
    assinante_id,
    estabelecimento_id,
    usuario_id = null,
    latitude_chegada = null,
    longitude_chegada = null
  }) => {
    const visitaExistenteQuery = `
      SELECT *
      FROM visitas
      WHERE assinante_id = $1
        AND estabelecimento_id = $2
        AND status = 'em_andamento'
        AND (
          ($3::BIGINT IS NOT NULL AND rota_ponto_id = $3)
          OR
          ($3::BIGINT IS NULL AND rota_ponto_id IS NULL)
        )
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const visitaExistente = await connection.query(visitaExistenteQuery, [
      assinante_id,
      estabelecimento_id,
      rota_ponto_id
    ]);

    if (visitaExistente.rows.length) {
      return visitaExistente.rows[0];
    }

    const criarVisitaQuery = `
      INSERT INTO visitas (
        rota_id,
        rota_ponto_id,
        assinante_id,
        estabelecimento_id,
        usuario_id,
        status,
        latitude_chegada,
        longitude_chegada,
        data_chegada
      )
      VALUES ($1, $2, $3, $4, $5, 'em_andamento', $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const novaVisita = await connection.query(criarVisitaQuery, [
      rota_id,
      rota_ponto_id,
      assinante_id,
      estabelecimento_id,
      usuario_id,
      latitude_chegada,
      longitude_chegada
    ]);

    return novaVisita.rows[0];
  };

  findVisitaById = async (visitaId, assinanteId) => {
    const query = `
      SELECT
        v.*,
        e.estabelecimento,
        e.produto,
        e.endereco,
        e.bairro,
        e.responsavel_nome,
        e.telefone_contato
      FROM visitas v
      JOIN estabelecimentos e
        ON e.id = v.estabelecimento_id
       AND e.assinante_id = v.assinante_id
      WHERE v.id = $1
        AND v.assinante_id = $2
      LIMIT 1
    `;

    const result = await connection.query(query, [visitaId, assinanteId]);
    return result.rows[0] || null;
  };

  findProdutosByVisita = async (visitaId, assinanteId) => {
    const query = `
      SELECT *
      FROM visita_produtos
      WHERE visita_id = $1
        AND assinante_id = $2
      ORDER BY id ASC
    `;

    const result = await connection.query(query, [visitaId, assinanteId]);
    return result.rows;
  };

  findVisitaCompletaById = async (visitaId, assinanteId) => {
    const visita = await this.findVisitaById(visitaId, assinanteId);

    if (!visita) {
      return null;
    }

    const produtos = await this.findProdutosByVisita(visitaId, assinanteId);

    return {
      ...visita,
      produtos
    };
  };

  createProdutoIfNotExists = async ({
    visita_id,
    assinante_id,
    produto,
    status = 'pendente'
  }) => {
    const produtoNormalizado = String(produto || '').trim().toUpperCase();

    const existenteQuery = `
      SELECT *
      FROM visita_produtos
      WHERE visita_id = $1
        AND assinante_id = $2
        AND produto = $3
      LIMIT 1
    `;

    const existente = await connection.query(existenteQuery, [
      visita_id,
      assinante_id,
      produtoNormalizado
    ]);

    if (existente.rows.length) {
      return existente.rows[0];
    }

    const criarQuery = `
      INSERT INTO visita_produtos (
        visita_id,
        assinante_id,
        produto,
        status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await connection.query(criarQuery, [
      visita_id,
      assinante_id,
      produtoNormalizado,
      status
    ]);

    return result.rows[0];
  };

  iniciarProdutosDaVisita = async ({
    visita_id,
    assinante_id,
    produtos = []
  }) => {
    if (!Array.isArray(produtos) || !produtos.length) {
      return [];
    }

    const produtosCriados = [];

    for (const produto of produtos) {
      const produtoCriado = await this.createProdutoIfNotExists({
        visita_id,
        assinante_id,
        produto,
        status: 'pendente'
      });

      produtosCriados.push(produtoCriado);
    }

    return produtosCriados;
  };

  marcarProdutoRegistrado = async ({
    visita_id,
    assinante_id,
    produto,
    sangria_id = null,
    observacoes = null
  }) => {
    const produtoNormalizado = String(produto || '').trim().toUpperCase();

    const query = `
      UPDATE visita_produtos
      SET
        status = 'registrado',
        sangria_id = COALESCE($4, sangria_id),
        observacoes = COALESCE($5, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE visita_id = $1
        AND assinante_id = $2
        AND produto = $3
      RETURNING *
    `;

    const result = await connection.query(query, [
      visita_id,
      assinante_id,
      produtoNormalizado,
      sangria_id,
      observacoes
    ]);

    return result.rows[0] || null;
  };

  marcarProdutoSemMovimentacao = async ({
    visita_id,
    assinante_id,
    produto,
    observacoes = null
  }) => {
    const produtoNormalizado = String(produto || '').trim().toUpperCase();

    const query = `
      UPDATE visita_produtos
      SET
        status = 'sem_movimentacao',
        observacoes = COALESCE($4, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE visita_id = $1
        AND assinante_id = $2
        AND produto = $3
      RETURNING *
    `;

    const result = await connection.query(query, [
      visita_id,
      assinante_id,
      produtoNormalizado,
      observacoes
    ]);

    return result.rows[0] || null;
  };

  marcarProdutoNaoRealizado = async ({
    visita_id,
    assinante_id,
    produto,
    observacoes = null
  }) => {
    const produtoNormalizado = String(produto || '').trim().toUpperCase();

    const query = `
      UPDATE visita_produtos
      SET
        status = 'nao_realizada',
        observacoes = COALESCE($4, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE visita_id = $1
        AND assinante_id = $2
        AND produto = $3
      RETURNING *
    `;

    const result = await connection.query(query, [
      visita_id,
      assinante_id,
      produtoNormalizado,
      observacoes
    ]);

    return result.rows[0] || null;
  };

  finalizarVisita = async ({
    visita_id,
    assinante_id,
    observacoes = null
  }) => {
    const pendentesQuery = `
      SELECT COUNT(*)::INTEGER AS total_pendentes
      FROM visita_produtos
      WHERE visita_id = $1
        AND assinante_id = $2
        AND status = 'pendente'
    `;

    const pendentes = await connection.query(pendentesQuery, [
      visita_id,
      assinante_id
    ]);

    const totalPendentes = pendentes.rows[0]?.total_pendentes || 0;

    if (totalPendentes > 0) {
      throw new Error('Ainda existem produtos pendentes nesta visita.');
    }

    const finalizarQuery = `
      UPDATE visitas
      SET
        status = 'finalizada',
        observacoes = COALESCE($3, observacoes),
        data_finalizacao = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
        AND status = 'em_andamento'
      RETURNING *
    `;

    const result = await connection.query(finalizarQuery, [
      visita_id,
      assinante_id,
      observacoes
    ]);

    return result.rows[0] || null;
  };

  finalizarVisitaNaoRealizada = async ({
    visita_id,
    assinante_id,
    motivo_nao_realizada,
    observacoes = null
  }) => {
    const query = `
      UPDATE visitas
      SET
        status = 'nao_realizada',
        motivo_nao_realizada = $3,
        observacoes = COALESCE($4, observacoes),
        data_finalizacao = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
        AND status = 'em_andamento'
      RETURNING *
    `;

    const result = await connection.query(query, [
      visita_id,
      assinante_id,
      motivo_nao_realizada,
      observacoes
    ]);

    return result.rows[0] || null;
  };
}

export default new VisitasModel();