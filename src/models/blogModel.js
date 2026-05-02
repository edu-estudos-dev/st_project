import pool from '../db_config/connection.js';

const blogModel = {
  async buscarPostsPublicados() {
    const query = `
      SELECT
        id,
        titulo,
        slug,
        resumo,
        categoria,
        imagem_capa,
        meta_title,
        meta_description,
        autor,
        status,
        data_publicacao,
        data_criacao,
        data_atualizacao
      FROM blog_posts
      WHERE status = 'publicado'
        AND data_publicacao <= NOW()
      ORDER BY data_publicacao DESC NULLS LAST, data_criacao DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  async buscarPostPorSlug(slug) {
    const query = `
      SELECT
        id,
        titulo,
        slug,
        resumo,
        conteudo,
        categoria,
        imagem_capa,
        meta_title,
        meta_description,
        autor,
        status,
        data_publicacao,
        data_criacao,
        data_atualizacao
      FROM blog_posts
      WHERE slug = $1
        AND status = 'publicado'
        AND data_publicacao <= NOW()
      LIMIT 1
    `;

    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  },

  async buscarPostsPorCategoria(categoria) {
    const query = `
      SELECT
        id,
        titulo,
        slug,
        resumo,
        categoria,
        imagem_capa,
        meta_title,
        meta_description,
        autor,
        status,
        data_publicacao,
        data_criacao,
        data_atualizacao
      FROM blog_posts
      WHERE status = 'publicado'
        AND data_publicacao <= NOW()
        AND btrim(
          regexp_replace(
            lower(
              translate(
                categoria,
                'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
              )
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '-'
        ) = lower($1)
      ORDER BY data_publicacao DESC NULLS LAST, data_criacao DESC
    `;

    const result = await pool.query(query, [categoria]);
    return result.rows;
  },

  async buscarPostsRelacionados({ categoria, slugAtual, limite = 3 }) {
    const query = `
      SELECT
        id,
        titulo,
        slug,
        resumo,
        categoria,
        imagem_capa,
        data_publicacao
      FROM blog_posts
      WHERE status = 'publicado'
        AND data_publicacao <= NOW()
        AND LOWER(categoria) = LOWER($1)
        AND slug <> $2
      ORDER BY data_publicacao DESC NULLS LAST, data_criacao DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [categoria, slugAtual, limite]);
    return result.rows;
  },

  async buscarCategoriasPublicadas() {
    const query = `
      SELECT
        categoria,
        COUNT(*)::int AS total
      FROM blog_posts
      WHERE status = 'publicado'
        AND data_publicacao <= NOW()
      GROUP BY categoria
      ORDER BY categoria ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }
};

export default blogModel;