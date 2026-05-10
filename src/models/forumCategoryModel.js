import pool from '../db_config/connection.js';

const forumCategoryModel = {
  async listarAtivasComResumo() {
    const query = `
      SELECT
        c.id,
        c.nome,
        c.slug,
        c.descricao,
        c.ordem,
        c.is_active,
        c.created_at,
        c.updated_at,
        COUNT(t.id)::int AS total_topicos,
        MAX(COALESCE(t.last_reply_at, t.created_at)) AS ultima_atividade
      FROM forum_categories c
      LEFT JOIN forum_topics t
        ON t.category_id = c.id
        AND t.status <> 'hidden'
        AND t.deleted_at IS NULL
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.ordem ASC, c.nome ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  async listarAtivas() {
    const query = `
      SELECT
        id,
        nome,
        slug,
        descricao,
        ordem,
        is_active,
        created_at,
        updated_at
      FROM forum_categories
      WHERE is_active = TRUE
      ORDER BY ordem ASC, nome ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  async buscarPorSlug(slug) {
    const query = `
      SELECT
        id,
        nome,
        slug,
        descricao,
        ordem,
        is_active,
        created_at,
        updated_at
      FROM forum_categories
      WHERE slug = $1
        AND is_active = TRUE
      LIMIT 1
    `;

    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  },

  async buscarPorId(id) {
    const query = `
      SELECT
        id,
        nome,
        slug,
        descricao,
        ordem,
        is_active,
        created_at,
        updated_at
      FROM forum_categories
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
};

export default forumCategoryModel;