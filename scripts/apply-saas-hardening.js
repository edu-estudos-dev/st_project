import pool from '../src/db_config/connection.js';

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdAssinantes = await client.query(`
      INSERT INTO assinantes (
        user_id,
        status_assinatura,
        tipo_cobranca,
        trial_inicio,
        trial_fim,
        created_at,
        updated_at
      )
      SELECT
        u.id,
        'trial',
        NULL,
        NOW(),
        NOW() + INTERVAL '7 days',
        NOW(),
        NOW()
      FROM users u
      LEFT JOIN assinantes a ON a.user_id = u.id
      WHERE a.id IS NULL
      RETURNING id, user_id, status_assinatura, trial_inicio, trial_fim
    `);

    await client.query(`
      ALTER TABLE assinantes
      ADD COLUMN IF NOT EXISTS produtos_habilitados TEXT
    `);

    await client.query(`
      UPDATE assinantes a
      SET produtos_habilitados = produtos.produtos_habilitados
      FROM (
        SELECT
          assinante_id,
          STRING_AGG(produto_key, ', ' ORDER BY produto_order) AS produtos_habilitados
        FROM (
          SELECT DISTINCT assinante_id, 'BOLINHAS' AS produto_key, 1 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%BOLINHAS%'
          UNION
          SELECT DISTINCT assinante_id, 'FIGURINHAS' AS produto_key, 2 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%FIGURINHAS%'
          UNION
          SELECT DISTINCT assinante_id, 'PELUCIAS' AS produto_key, 3 AS produto_order
          FROM estabelecimentos
          WHERE status = 'ativo' AND UPPER(produto) LIKE '%PELUCIAS%'
        ) origem
        GROUP BY assinante_id
      ) produtos
      WHERE a.id = produtos.assinante_id
        AND COALESCE(TRIM(a.produtos_habilitados), '') = ''
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique
      ON users (LOWER(TRIM(username)))
      WHERE username IS NOT NULL AND TRIM(username) <> ''
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
      ON users (LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) <> ''
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_estabelecimentos_id_assinante_unique
      ON estabelecimentos (id, assinante_id)
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_bolinha_estabelecimento_assinante'
        ) THEN
          ALTER TABLE sangrias_bolinha
          ADD CONSTRAINT fk_bolinha_estabelecimento_assinante
          FOREIGN KEY (estabelecimento_id, assinante_id)
          REFERENCES estabelecimentos (id, assinante_id);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_figurinhas_estabelecimento_assinante'
        ) THEN
          ALTER TABLE sangrias_figurinhas
          ADD CONSTRAINT fk_figurinhas_estabelecimento_assinante
          FOREIGN KEY (estabelecimento_id, assinante_id)
          REFERENCES estabelecimentos (id, assinante_id);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_pelucias_estabelecimento_assinante'
        ) THEN
          ALTER TABLE sangrias_pelucias
          ADD CONSTRAINT fk_pelucias_estabelecimento_assinante
          FOREIGN KEY (estabelecimento_id, assinante_id)
          REFERENCES estabelecimentos (id, assinante_id);
        END IF;
      END $$;
    `);

    await client.query('COMMIT');

    console.log(JSON.stringify({
      createdAssinantes: createdAssinantes.rows
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
