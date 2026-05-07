import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..');
const migrationsDir = path.join(rootDir, 'migrations');
const databaseUrl = process.env.CLEAN_DATABASE_URL || process.env.DATABASE_URL;
const usingCleanDatabaseUrl = Boolean(process.env.CLEAN_DATABASE_URL);

if (!databaseUrl) {
  console.error('Defina CLEAN_DATABASE_URL para o banco limpo que recebera o schema.');
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

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'disable' ? false : undefined
});

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(row => row.filename));
}

async function runMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(filePath, 'utf8');

  await client.query('BEGIN');

  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`Aplicada: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  await client.connect();

  try {
    await ensureMigrationsTable();

    const files = (await fs.readdir(migrationsDir))
      .filter(filename => filename.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    const applied = await getAppliedMigrations();

    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`Ignorada: ${filename}`);
        continue;
      }

      await runMigration(filename);
    }
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error('Falha ao aplicar migrations:', error);
  process.exit(1);
});
