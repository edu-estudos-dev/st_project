import connection from '../db_config/connection.js';

class RotasOperacionaisModel {
  createRota = async ({
    assinante_id,
    usuario_id = null,
    produto_filtro = 'todos',
    bairros = [],
    origem_latitude = null,
    origem_longitude = null
  }) => {
    const bairrosTexto = Array.isArray(bairros) ? bairros.join(',') : String(bairros || '');

    const query = `
      INSERT INTO rotas_operacionais (
        assinante_id,
        usuario_id,
        status,
        produto_filtro,
        bairros,
        origem_latitude,
        origem_longitude,
        data_inicio
      )
      VALUES ($1, $2, 'em_andamento', $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await connection.query(query, [
      assinante_id,
      usuario_id,
      produto_filtro,
      bairrosTexto,
      origem_latitude,
      origem_longitude
    ]);

    return result.rows[0];
  };

  createRotaPontos = async ({ rota_id, assinante_id, pontos = [] }) => {
    if (!Array.isArray(pontos) || pontos.length === 0) {
      return [];
    }

    const values = [];
    const placeholders = pontos.map((ponto, index) => {
      const baseIndex = index * 4;

      values.push(
        rota_id,
        assinante_id,
        ponto.estabelecimento_id || ponto.id,
        ponto.ordem || index + 1
      );

      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, 'pendente')`;
    });

    const query = `
      INSERT INTO rota_pontos (
        rota_id,
        assinante_id,
        estabelecimento_id,
        ordem,
        status
      )
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await connection.query(query, values);
    return result.rows;
  };

  findRotaById = async (rotaId, assinanteId) => {
    const query = `
      SELECT *
      FROM rotas_operacionais
      WHERE id = $1
        AND assinante_id = $2
      LIMIT 1
    `;

    const result = await connection.query(query, [rotaId, assinanteId]);
    return result.rows[0] || null;
  };

  findPontosByRota = async (rotaId, assinanteId) => {
    const query = `
      SELECT
        rp.*,
        e.estabelecimento,
        e.produto,
        e.endereco,
        e.bairro,
        e.responsavel_nome,
        e.telefone_contato,
        e.chave,
        e.maquina,
        e.chave_bolinhas,
        e.maquina_bolinhas,
        e.chave_pelucias,
        e.maquina_pelucias,
        e.latitude,
        e.longitude
      FROM rota_pontos rp
      JOIN estabelecimentos e
        ON e.id = rp.estabelecimento_id
       AND e.assinante_id = rp.assinante_id
      WHERE rp.rota_id = $1
        AND rp.assinante_id = $2
      ORDER BY rp.ordem ASC
    `;

    const result = await connection.query(query, [rotaId, assinanteId]);
    return result.rows;
  };

  findRotaCompletaById = async (rotaId, assinanteId) => {
    const rota = await this.findRotaById(rotaId, assinanteId);

    if (!rota) {
      return null;
    }

    const pontos = await this.findPontosByRota(rotaId, assinanteId);

    return {
      ...rota,
      pontos
    };
  };

  findPontoDaRotaById = async (rotaPontoId, assinanteId) => {
    const query = `
      SELECT
        rp.*,
        e.estabelecimento,
        e.produto,
        e.endereco,
        e.bairro,
        e.responsavel_nome,
        e.telefone_contato,
        e.observacoes AS observacoes_estabelecimento,
        e.chave,
        e.maquina,
        e.chave_bolinhas,
        e.maquina_bolinhas,
        e.chave_pelucias,
        e.maquina_pelucias,
        e.latitude,
        e.longitude
      FROM rota_pontos rp
      JOIN estabelecimentos e
        ON e.id = rp.estabelecimento_id
       AND e.assinante_id = rp.assinante_id
      WHERE rp.id = $1
        AND rp.assinante_id = $2
      LIMIT 1
    `;

    const result = await connection.query(query, [rotaPontoId, assinanteId]);
    return result.rows[0] || null;
  };

  marcarPontoEmAndamento = async ({
    rota_ponto_id,
    assinante_id,
    latitude_chegada = null,
    longitude_chegada = null
  }) => {
    const query = `
      UPDATE rota_pontos
      SET
        status = 'em_andamento',
        latitude_chegada = COALESCE($3, latitude_chegada),
        longitude_chegada = COALESCE($4, longitude_chegada),
        iniciado_em = COALESCE(iniciado_em, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
        AND status IN ('pendente', 'em_andamento')
      RETURNING *
    `;

    const result = await connection.query(query, [
      rota_ponto_id,
      assinante_id,
      latitude_chegada,
      longitude_chegada
    ]);

    return result.rows[0] || null;
  };

  marcarPontoVisitado = async ({
    rota_ponto_id,
    assinante_id,
    observacao = null
  }) => {
    const query = `
      UPDATE rota_pontos
      SET
        status = 'visitado',
        observacao = COALESCE($3, observacao),
        visitado_em = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
      RETURNING *
    `;

    const result = await connection.query(query, [
      rota_ponto_id,
      assinante_id,
      observacao
    ]);

    return result.rows[0] || null;
  };

  marcarPontoNaoRealizado = async ({
    rota_ponto_id,
    assinante_id,
    observacao = null
  }) => {
    const query = `
      UPDATE rota_pontos
      SET
        status = 'nao_realizada',
        observacao = COALESCE($3, observacao),
        nao_realizado_em = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
      RETURNING *
    `;

    const result = await connection.query(query, [
      rota_ponto_id,
      assinante_id,
      observacao
    ]);

    return result.rows[0] || null;
  };

  getProximoPontoPendente = async (rotaId, assinanteId) => {
    const query = `
      SELECT *
      FROM rota_pontos
      WHERE rota_id = $1
        AND assinante_id = $2
        AND status = 'pendente'
      ORDER BY ordem ASC
      LIMIT 1
    `;

    const result = await connection.query(query, [rotaId, assinanteId]);
    return result.rows[0] || null;
  };

  finalizarRotaSeConcluida = async (rotaId, assinanteId) => {
    const pendentesQuery = `
      SELECT COUNT(*)::INTEGER AS total_pendentes
      FROM rota_pontos
      WHERE rota_id = $1
        AND assinante_id = $2
        AND status IN ('pendente', 'em_andamento')
    `;

    const pendentesResult = await connection.query(pendentesQuery, [
      rotaId,
      assinanteId
    ]);

    const totalPendentes = pendentesResult.rows[0]?.total_pendentes || 0;

    if (totalPendentes > 0) {
      return null;
    }

    const finalizarQuery = `
      UPDATE rotas_operacionais
      SET
        status = 'finalizada',
        data_finalizacao = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
        AND status = 'em_andamento'
      RETURNING *
    `;

    const result = await connection.query(finalizarQuery, [rotaId, assinanteId]);
    return result.rows[0] || null;
  };
}

export default new RotasOperacionaisModel();