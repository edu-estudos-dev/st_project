import connection from '../db_config/connection.js';

let ensuredTable = false;

const ensureInteressadosTable = async () => {
  if (ensuredTable) {
    return;
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS interessados (
      id BIGSERIAL PRIMARY KEY,
      nome VARCHAR(160) NOT NULL,
      telefone VARCHAR(30) NOT NULL,
      email VARCHAR(160) NOT NULL,
      produtos TEXT NOT NULL,
      preferencia_contato VARCHAR(40),
      data TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await connection.query(`
    ALTER TABLE interessados
      ADD COLUMN IF NOT EXISTS email VARCHAR(160),
      ADD COLUMN IF NOT EXISTS preferencia_contato VARCHAR(40),
      ADD COLUMN IF NOT EXISTS data TIMESTAMPTZ DEFAULT NOW();
  `);

  await connection.query(`
    ALTER TABLE interessados
      ALTER COLUMN email DROP NOT NULL,
      ALTER COLUMN produtos DROP NOT NULL;
  `);

  ensuredTable = true;
};

export const salvarContato = async contato => {
  const { nome, telefone, email, produtos, preferenciaContato } = contato;

  if (!nome || !telefone) {
    throw new Error('Nome e telefone precisam ser informados.');
  }

  await ensureInteressadosTable();

  const query = `
    INSERT INTO interessados (nome, telefone, email, produtos, preferencia_contato, data)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `;

  try {
    const result = await connection.query(query, [
      nome,
      telefone,
      email || null,
      JSON.stringify(Array.isArray(produtos) && produtos.length ? produtos : ['Nao informado']),
      preferenciaContato || null
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao salvar contato:', error);
    throw error;
  }
};
