import connection from '../db_config/connection.js';

export const salvarContato = async contato => {
  const { nome, telefone, produtos } = contato;

  // Verifique se os parâmetros estão definidos
  if (!nome || !telefone || !produtos) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  const query =
    'INSERT INTO interessados (nome, telefone, produtos, data) VALUES ($1, $2, $3, NOW()) RETURNING id';

  try {
    const result = await connection.query(query, [
      nome,
      telefone,
      JSON.stringify(produtos)
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao salvar contato:', error);
    throw error;
  }
};
