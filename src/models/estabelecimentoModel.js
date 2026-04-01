import connection from '../db_config/connection.js';
import { hasProduto } from '../utilities/produtoUtils.js';

class EstabelecimentoModel {
  findAll = async () => {
    try {
      const SQL = 'SELECT * FROM estabelecimentos WHERE status = $1';
      const result = await connection.query(SQL, ['ativo']);
      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query:', error);
      throw new Error('Erro ao buscar estabelecimentos ativos.');
    }
  };

  search = async query => {
    try {
      const SQL = `
                SELECT * FROM estabelecimentos 
                WHERE (estabelecimento ILIKE $1 OR responsavel_nome ILIKE $2 OR bairro ILIKE $3) 
                AND status = $4
            `;
      const result = await connection.query(SQL, [
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        'ativo'
      ]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao executar a query de busca:', error);
      throw new Error('Erro ao buscar estabelecimentos.');
    }
  };

  create = async ({
    estabelecimento,
    produto,
    chave,
    maquina,
    endereco,
    bairro,
    responsavel_nome,
    telefone_contato,
    observacoes
  }) => {
    try {
      const SQL = `INSERT INTO estabelecimentos 
                        (estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, data_criacao, status) 
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

      const dateISO = new Date();

      await connection.query(SQL, [
        estabelecimento,
        produto,
        chave,
        maquina,
        endereco,
        bairro,
        responsavel_nome,
        telefone_contato,
        observacoes,
        dateISO,
        'ativo'
      ]);
    } catch (error) {
      console.error('Erro ao criar novo estabelecimento:', error);
      throw new Error('Erro ao criar novo estabelecimento.');
    }
  };

  update = async (
    id,
    {
      estabelecimento,
      produto,
      chave,
      maquina,
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes
    }
  ) => {
    const sql = `UPDATE estabelecimentos SET
            estabelecimento = $1,
            produto = $2,
            chave = $3,
            maquina = $4,
            endereco = $5,
            bairro = $6,
            responsavel_nome = $7,
            telefone_contato = $8,
            observacoes = $9,
            data_atualizacao = $10 WHERE id = $11`;

    const dateISO = new Date();

    const result = await connection.query(sql, [
      estabelecimento,
      produto,
      chave,
      maquina,
      endereco,
      bairro,
      responsavel_nome,
      telefone_contato,
      observacoes,
      dateISO,
      id
    ]);

    return result;
  };

  findById = async id => {
    const sql = 'SELECT * FROM estabelecimentos WHERE id = $1';
    const result = await connection.query(sql, [id]);
    return result.rows[0];
  };

  destroy = async id => {
    try {
      const sql =
        'UPDATE estabelecimentos SET status = $1, data_encerramento = $2 WHERE id = $3';
      const dataEncerramento = new Date();

      const result = await connection.query(sql, [
        'inativo',
        dataEncerramento,
        id
      ]);
      console.log('Estabelecimento marcado como inativo:', result);
    } catch (error) {
      console.error('Erro ao deletar o estabelecimento:', error);
      throw new Error('Erro ao deletar o estabelecimento.');
    }
  };

  getBairrosByProduto = async produto => {
    try {
      const SQL =
        'SELECT DISTINCT bairro FROM estabelecimentos WHERE UPPER(produto) LIKE $1 AND status = $2';
      const result = await connection.query(SQL, [
        `%${produto.toUpperCase()}%`,
        'ativo'
      ]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Erro ao buscar bairros.');
    }
  };

  getMenuProdutosDisponiveis = async () => {
    try {
      const SQL =
        "SELECT produto FROM estabelecimentos WHERE status = $1 AND produto IS NOT NULL AND produto <> ''";
      const result = await connection.query(SQL, ['ativo']);

      const disponibilidade = {
        bolinhas: false,
        figurinhas: false,
        pelucias: false
      };

      for (const row of result.rows) {
        if (!disponibilidade.bolinhas && hasProduto(row.produto, 'BOLINHAS')) {
          disponibilidade.bolinhas = true;
        }

        if (
          !disponibilidade.figurinhas &&
          hasProduto(row.produto, 'FIGURINHAS')
        ) {
          disponibilidade.figurinhas = true;
        }

        if (!disponibilidade.pelucias && hasProduto(row.produto, 'PELUCIAS')) {
          disponibilidade.pelucias = true;
        }
      }

      disponibilidade.hasAny =
        disponibilidade.bolinhas ||
        disponibilidade.figurinhas ||
        disponibilidade.pelucias;
      return disponibilidade;
    } catch (error) {
      console.error(
        'Erro ao carregar produtos disponíveis para o menu:',
        error
      );
      return {
        bolinhas: true,
        figurinhas: true,
        pelucias: true,
        hasAny: true
      };
    }
  };
}

export default new EstabelecimentoModel();
