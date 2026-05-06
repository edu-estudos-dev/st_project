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
      ADD COLUMN IF NOT EXISTS data TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS contato_status VARCHAR(24) DEFAULT 'pendente',
      ADD COLUMN IF NOT EXISTS contato_realizado_em TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS contato_atualizado_em TIMESTAMPTZ NULL;
  `);

  await connection.query(`
    UPDATE interessados
    SET contato_status = 'pendente'
    WHERE contato_status IS NULL
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

export const listarContatos = async ({ limit = 200 } = {}) => {
  await ensureInteressadosTable();

  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  const result = await connection.query(
    `SELECT
        id,
        nome,
        telefone,
        email,
        produtos,
        preferencia_contato,
        data,
        contato_status,
        contato_realizado_em,
        contato_atualizado_em
     FROM interessados
     ORDER BY data DESC, id DESC
     LIMIT $1`,
    [safeLimit]
  );

  return result.rows.map(row => {
    let produtosLista = [];

    try {
      const parsed = JSON.parse(row.produtos || '[]');
      produtosLista = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      produtosLista = row.produtos ? [row.produtos] : [];
    }

    return {
      ...row,
      produtos_lista: produtosLista
    };
  });
};

export const atualizarStatusContato = async ({ id, status }) => {
  await ensureInteressadosTable();

  const normalizedId = Number(id);
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw new Error('Contato invalido.');
  }

  if (!['pendente', 'contatado'].includes(normalizedStatus)) {
    throw new Error('Status invalido.');
  }

  const result = await connection.query(
    `UPDATE interessados
     SET
       contato_status = $2::varchar,
       contato_realizado_em = CASE
         WHEN $2::text = 'contatado' THEN COALESCE(contato_realizado_em, NOW())
         ELSE NULL
       END,
       contato_atualizado_em = NOW()
     WHERE id = $1
     RETURNING id`,
    [normalizedId, normalizedStatus]
  );

  return result.rowCount > 0;
};
