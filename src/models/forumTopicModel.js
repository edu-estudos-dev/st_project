import pool from '../db_config/connection.js';

const PUBLIC_TOPIC_STATUSES = ['open', 'closed'];

const forumTopicModel = {
  async existsBySlug(slug) {
    const result = await pool.query(
      'SELECT 1 FROM forum_topics WHERE slug = $1 LIMIT 1',
      [slug]
    );

    return Boolean(result.rows[0]);
  },

  async listarRecentes({ limit = 12 } = {}) {
    const query = `
      SELECT
        t.id,
        t.category_id,
        t.author_user_id,
        t.assinante_id,
        t.titulo,
        t.slug,
        t.conteudo,
        t.status,
        t.is_pinned,
        t.reply_count,
        t.view_count,
        t.last_reply_at,
        t.created_at,
        t.updated_at,
        c.nome AS categoria_nome,
        c.slug AS categoria_slug,
        u.username AS autor_nome,
        last_user.username AS ultimo_autor_nome
      FROM forum_topics t
      INNER JOIN forum_categories c ON c.id = t.category_id
      LEFT JOIN users u ON u.id = t.author_user_id
      LEFT JOIN users last_user ON last_user.id = t.last_reply_user_id
      WHERE t.status = ANY($1)
        AND t.deleted_at IS NULL
        AND c.is_active = TRUE
      ORDER BY
        t.is_pinned DESC,
        COALESCE(t.last_reply_at, t.created_at) DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [PUBLIC_TOPIC_STATUSES, limit]);
    return result.rows;
  },

  async listarPorCategoria({ categoryId, limit = 30, offset = 0 }) {
    const query = `
      SELECT
        t.id,
        t.category_id,
        t.author_user_id,
        t.assinante_id,
        t.titulo,
        t.slug,
        t.conteudo,
        t.status,
        t.is_pinned,
        t.reply_count,
        t.view_count,
        t.last_reply_at,
        t.created_at,
        t.updated_at,
        c.nome AS categoria_nome,
        c.slug AS categoria_slug,
        u.username AS autor_nome,
        last_user.username AS ultimo_autor_nome
      FROM forum_topics t
      INNER JOIN forum_categories c ON c.id = t.category_id
      LEFT JOIN users u ON u.id = t.author_user_id
      LEFT JOIN users last_user ON last_user.id = t.last_reply_user_id
      WHERE t.category_id = $1
        AND t.status = ANY($2)
        AND t.deleted_at IS NULL
        AND c.is_active = TRUE
      ORDER BY
        t.is_pinned DESC,
        COALESCE(t.last_reply_at, t.created_at) DESC
      LIMIT $3
      OFFSET $4
    `;

    const result = await pool.query(query, [
      categoryId,
      PUBLIC_TOPIC_STATUSES,
      limit,
      offset
    ]);

    return result.rows;
  },

  async buscarPorSlug(slug, { includeHidden = false } = {}) {
    const statuses = includeHidden
      ? ['open', 'closed', 'hidden']
      : PUBLIC_TOPIC_STATUSES;

    const query = `
      SELECT
        t.id,
        t.category_id,
        t.author_user_id,
        t.assinante_id,
        t.titulo,
        t.slug,
        t.conteudo,
        t.status,
        t.is_pinned,
        t.reply_count,
        t.view_count,
        t.last_reply_at,
        t.last_reply_user_id,
        t.created_at,
        t.updated_at,
        c.nome AS categoria_nome,
        c.slug AS categoria_slug,
        u.username AS autor_nome,
        last_user.username AS ultimo_autor_nome
      FROM forum_topics t
      INNER JOIN forum_categories c ON c.id = t.category_id
      LEFT JOIN users u ON u.id = t.author_user_id
      LEFT JOIN users last_user ON last_user.id = t.last_reply_user_id
      WHERE t.slug = $1
        AND t.status = ANY($2)
        AND t.deleted_at IS NULL
      LIMIT 1
    `;

    const result = await pool.query(query, [slug, statuses]);
    return result.rows[0] || null;
  },

  async criar({ categoryId, authorUserId, assinanteId, titulo, slug, conteudo }) {
    const query = `
      INSERT INTO forum_topics (
        category_id,
        author_user_id,
        assinante_id,
        titulo,
        slug,
        conteudo,
        status,
        is_pinned,
        reply_count,
        view_count,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'open', FALSE, 0, 0, NOW(), NOW())
      RETURNING
        id,
        category_id,
        author_user_id,
        assinante_id,
        titulo,
        slug,
        conteudo,
        status,
        is_pinned,
        reply_count,
        view_count,
        created_at,
        updated_at
    `;

    const result = await pool.query(query, [
      categoryId,
      authorUserId,
      assinanteId || null,
      titulo,
      slug,
      conteudo
    ]);

    return result.rows[0];
  },

  async incrementarVisualizacao(id) {
    await pool.query(
      `
        UPDATE forum_topics
        SET
          view_count = view_count + 1,
          updated_at = updated_at
        WHERE id = $1
      `,
      [id]
    );
  },

  async listarAdmin({ limit = 80 } = {}) {
    const query = `
      SELECT
        t.id,
        t.category_id,
        t.author_user_id,
        t.assinante_id,
        t.titulo,
        t.slug,
        t.status,
        t.is_pinned,
        t.reply_count,
        t.view_count,
        t.last_reply_at,
        t.created_at,
        t.updated_at,
        c.nome AS categoria_nome,
        c.slug AS categoria_slug,
        u.username AS autor_nome
      FROM forum_topics t
      INNER JOIN forum_categories c ON c.id = t.category_id
      LEFT JOIN users u ON u.id = t.author_user_id
      WHERE t.deleted_at IS NULL
      ORDER BY
        t.status = 'hidden' DESC,
        t.is_pinned DESC,
        COALESCE(t.last_reply_at, t.created_at) DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  },

 async ocultar(id) {
  const result = await pool.query(
    `
      UPDATE forum_topics
      SET
        status = 'hidden',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id]
  );

  return result.rows[0] || null;
},

async reexibir(id) {
  const result = await pool.query(
    `
      UPDATE forum_topics
      SET
        status = 'open',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'hidden'
      RETURNING *
    `,
    [id]
  );

  return result.rows[0] || null;
},

  async alternarFixado(id) {
    const result = await pool.query(
      `
        UPDATE forum_topics
        SET
          is_pinned = NOT is_pinned,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  },

  async alternarFechado(id) {
    const result = await pool.query(
      `
        UPDATE forum_topics
        SET
          status = CASE
            WHEN status = 'closed' THEN 'open'
            WHEN status = 'open' THEN 'closed'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    return result.rows[0] || null;
  }
};

export default forumTopicModel;