import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao foi definida.');
}

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = String(process.env.DB_SSL || 'true').trim().toLowerCase() !== 'false';
const rejectUnauthorized = String(
  process.env.DB_SSL_REJECT_UNAUTHORIZED || (isProduction ? 'true' : 'false')
).trim().toLowerCase() !== 'false';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: sslEnabled
    ? { rejectUnauthorized }
    : false
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado ao PostgreSQL com sucesso.');
    client.release();
  } catch (error) {
    console.error('Erro ao conectar no PostgreSQL.');
    console.error(error);
  }
};

pool.on('error', error => {
  console.error('Erro inesperado no pool do PostgreSQL.');
  console.error(error);
});

testConnection();

export default pool;
