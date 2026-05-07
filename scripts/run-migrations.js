import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pg;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, '..');
const migrationsDir = path.join(rootDir, 'migrations');

const migrationTarget = process.argv[2] || process.env.MIGRATION_TARGET;

const targets = {
  dev: {
    envName: 'DATABASE_URL',
    label: 'DESENVOLVIMENTO/DATABASE_URL'
  },
  clean: {
    envName: 'CLEAN_DATABASE_URL',
    label: 'LIMPO/CLEAN_DATABASE_URL'
  }
};

const targetConfig = targets[migrationTarget];

if (!targetConfig) {
  console.error(
    [
      'Informe explicitamente o alvo da migration.',
      '',
      'Uso:',
      '  node scripts/run-migrations.js dev',
      '  node scripts/run-migrations.js clean',
      '',
      'Ou use os scripts:',
      '  npm run db:migrate:dev',
      '  npm run db:migrate:clean'
    ].join('\n')
  );
  process.exit(1);
}

const databaseUrl = process.env[targetConfig.envName];

if (!databaseUrl) {
  console.error(
    `Defina ${targetConfig.envName} para aplicar migrations no banco ${targetConfig.label}.`
  );
  process.exit(1);
}

console.log(`Aplicando migrations no banco ${targetConfig.label}...`);

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
