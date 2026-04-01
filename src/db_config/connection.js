import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao foi definida.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado ao PostgreSQL com sucesso.');
    client.release();
  } catch (error) {
    console.error('Erro ao conectar no PostgreSQL.');
    console.error(error);
    process.exit(1);
  }
};

pool.on('error', error => {
  console.error('Erro inesperado no pool do PostgreSQL.');
  console.error(error);
});

testConnection();

export default pool;
