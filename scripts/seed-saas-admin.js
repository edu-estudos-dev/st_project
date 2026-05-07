import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.CLEAN_DATABASE_URL || process.env.DATABASE_URL;
const usingCleanDatabaseUrl = Boolean(process.env.CLEAN_DATABASE_URL);
const username = String(process.env.SEED_ADMIN_USERNAME || '').trim();
const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.SEED_ADMIN_PASSWORD || '');

if (!databaseUrl) {
  console.error('Defina CLEAN_DATABASE_URL para o banco limpo que recebera o admin.');
  process.exit(1);
}

if (!usingCleanDatabaseUrl && process.env.CONFIRM_CLEAN_DB_INIT !== 'true') {
  console.error(
    [
      'Por seguranca, este script prefere CLEAN_DATABASE_URL.',
      'Se voce realmente quer usar DATABASE_URL, rode com CONFIRM_CLEAN_DB_INIT=true.'
    ].join('\n')
  );
  process.exit(1);
}

if (!username || !email || !password) {
  console.error(
    'Defina SEED_ADMIN_USERNAME, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD antes de rodar.'
  );
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'disable' ? false : undefined
});

async function main() {
  await client.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(TRIM(username)) = LOWER($1)
          OR LOWER(TRIM(email)) = LOWER($2)
       LIMIT 1`,
      [username, email]
    );

    let userId = existing.rows[0]?.id;

    if (!userId) {
      const passwordHash = await bcrypt.hash(password, 12);
      const created = await client.query(
        `INSERT INTO users (username, email, senha, email_verified_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [username, email, passwordHash]
      );
      userId = created.rows[0].id;
    }

    const assinante = await client.query(
      `INSERT INTO assinantes (
        user_id,
        status_assinatura,
        tipo_cobranca,
        produtos_habilitados,
        plano_codigo,
        plano_nome,
        valor_mensal,
        data_ativacao,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        'ativo',
        'mensal',
        'BOLINHAS, FIGURINHAS, PELUCIAS',
        'admin',
        'Administrador SaaS',
        0,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        status_assinatura = 'ativo',
        produtos_habilitados = EXCLUDED.produtos_habilitados,
        updated_at = NOW()
      RETURNING id`,
      [userId]
    );

    await client.query('COMMIT');

    console.log(`Admin pronto. user_id=${userId}; assinante_id=${assinante.rows[0].id}`);
    console.log(`Configure SAAS_ADMIN_USER_IDS=${userId} no ambiente de producao.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error('Falha ao criar admin SaaS:', error);
  process.exit(1);
});
