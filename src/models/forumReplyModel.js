import pool from '../db_config/connection.js';

async function atualizarResumoTopico(client, topicId) {
  await client.query(
    `
      UPDATE forum_topics
      SET
        reply_count = (
          SELECT COUNT(*)::INTEGER
          FROM forum_replies
          WHERE topic_id = $1
            AND status = 'visible'
            AND deleted_at IS NULL
        ),
        last_reply_at = (
          SELECT MAX(created_at)
          FROM forum_replies
          WHERE topic_id = $1
            AND status = 'visible'
            AND deleted_at IS NULL
        ),
        last_reply_user_id = (
          SELECT author_user_id
          FROM forum_replies
          WHERE topic_id = $1
            AND status = 'visible'
            AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        ),
        updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [topicId]
  );
}

const forumReplyModel = {
  async listarPorTopico(topicId, { includeHidden = false } = {}) {
    const statuses = includeHidden ? ['visible', 'hidden'] : ['visible'];

    const query = `
      SELECT
        r.id,
        r.topic_id,
        r.author_user_id,
        r.assinante_id,
        r.conteudo,
        r.status,
        r.created_at,
        r.updated_at,
        u.username AS autor_nome
      FROM forum_replies r
      LEFT JOIN users u ON u.id = r.author_user_id
      WHERE r.topic_id = $1
        AND r.status = ANY($2)
        AND r.deleted_at IS NULL
      ORDER BY r.created_at ASC
    `;

    const result = await pool.query(query, [topicId, statuses]);
    return result.rows;
  },

  async criar({ topicId, authorUserId, assinanteId, conteudo }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const replyResult = await client.query(
        `
          INSERT INTO forum_replies (
            topic_id,
            author_user_id,
            assinante_id,
            conteudo,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 'visible', NOW(), NOW())
          RETURNING
            id,
            topic_id,
            author_user_id,
            assinante_id,
            conteudo,
            status,
            created_at,
            updated_at
        `,
        [
          topicId,
          authorUserId,
          assinanteId || null,
          conteudo
        ]
      );

      await client.query(
        `
          UPDATE forum_topics
          SET
            reply_count = reply_count + 1,
            last_reply_at = NOW(),
            last_reply_user_id = $2,
            updated_at = NOW()
          WHERE id = $1
            AND deleted_at IS NULL
        `,
        [topicId, authorUserId]
      );

      await client.query('COMMIT');

      return replyResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async ocultar(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const replyResult = await client.query(
        `
          UPDATE forum_replies
          SET
            status = 'hidden',
            updated_at = NOW()
          WHERE id = $1
            AND status = 'visible'
            AND deleted_at IS NULL
          RETURNING *
        `,
        [id]
      );

      const reply = replyResult.rows[0] || null;

      if (reply) {
        await atualizarResumoTopico(client, reply.topic_id);
      }

      await client.query('COMMIT');

      return reply;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async excluir(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const replyResult = await client.query(
        `
          UPDATE forum_replies
          SET
            status = 'hidden',
            deleted_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
            AND deleted_at IS NULL
          RETURNING *
        `,
        [id]
      );

      const reply = replyResult.rows[0] || null;

      if (reply) {
        await atualizarResumoTopico(client, reply.topic_id);
      }

      await client.query('COMMIT');

      return reply;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

export default forumReplyModel;