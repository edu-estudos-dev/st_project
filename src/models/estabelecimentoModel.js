import connection from '../db_config/connection.js';
import { hasProduto } from '../utilities/produtoUtils.js';

class EstabelecimentoModel {
    findAll = async () => {
        try {
            const SQL = 'SELECT * FROM estabelecimentos WHERE status = "ativo"';
            const [result] = await connection.execute(SQL);
            return result;
        } catch (error) {
            console.error('Erro ao executar a query:', error);
            throw new Error('Erro ao buscar estabelecimentos ativos.');
        }
    };

    search = async (query) => {
        try {
            const SQL = 'SELECT * FROM estabelecimentos WHERE (estabelecimento LIKE ? OR responsavel_nome LIKE ? OR bairro LIKE ?) AND status = "ativo"';
            const [result] = await connection.execute(SQL, [`%${query}%`, `%${query}%`, `%${query}%`]);
            return result;
        } catch (error) {
            console.error('Erro ao executar a query de busca:', error);
            throw new Error('Erro ao buscar estabelecimentos.');
        }
    };

    create = async ({ estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes }) => {
        try {
            const SQL = `INSERT INTO estabelecimentos 
                        (estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, data_criacao, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const dateISO = new Date().toISOString();
            await connection.execute(SQL, [estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, dateISO, 'ativo']);
        } catch (error) {
            console.error('Erro ao criar novo estabelecimento:', error);
            throw new Error('Erro ao criar novo estabelecimento.');
        }
    };

    update = async (id, { estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes }) => {
        const sql = `UPDATE estabelecimentos SET
            estabelecimento = ?,
            produto = ?,
            chave = ?,
            maquina = ?,
            endereco = ?,
            bairro = ?,
            responsavel_nome = ?,
            telefone_contato = ?,
            observacoes = ?,
            data_atualizacao = ? WHERE id = ?`;
        const dateISO = new Date().toISOString();
        const [result] = await connection.execute(sql, [estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, dateISO, id]);
        return result;
    };

    findById = async (id) => {
        const sql = 'SELECT * FROM estabelecimentos WHERE id = ?';
        const [result] = await connection.execute(sql, [id]);
        return result[0];
    };

    destroy = async (id) => {
        try {
            const sql = 'UPDATE estabelecimentos SET status = "inativo", data_encerramento = ? WHERE id = ?';
            const dataEncerramento = new Date().toISOString();
            const [result] = await connection.execute(sql, [dataEncerramento, id]);
            console.log('Estabelecimento marcado como inativo:', result);
        } catch (error) {
            console.error('Erro ao deletar o estabelecimento:', error);
            throw new Error('Erro ao deletar o estabelecimento.');
        }
    };

    getBairrosByProduto = async (produto) => {
        try {
            const SQL = 'SELECT DISTINCT bairro FROM estabelecimentos WHERE UPPER(produto) LIKE ? AND status = "ativo"';
            const [result] = await connection.execute(SQL, [`%${produto.toUpperCase()}%`]);
            return result;
        } catch (error) {
            console.error('Erro ao buscar bairros:', error);
            throw new Error('Erro ao buscar bairros.');
        }
    };

    getMenuProdutosDisponiveis = async () => {
        try {
            const SQL = 'SELECT produto FROM estabelecimentos WHERE status = "ativo" AND produto IS NOT NULL AND produto <> ""';
            const [result] = await connection.execute(SQL);

            const disponibilidade = {
                bolinhas: false,
                figurinhas: false,
                pelucias: false
            };

            for (const row of result) {
                if (!disponibilidade.bolinhas && hasProduto(row.produto, 'BOLINHAS')) {
                    disponibilidade.bolinhas = true;
                }

                if (!disponibilidade.figurinhas && hasProduto(row.produto, 'FIGURINHAS')) {
                    disponibilidade.figurinhas = true;
                }

                if (!disponibilidade.pelucias && hasProduto(row.produto, 'PELUCIAS')) {
                    disponibilidade.pelucias = true;
                }
            }

            disponibilidade.hasAny = disponibilidade.bolinhas || disponibilidade.figurinhas || disponibilidade.pelucias;
            return disponibilidade;
        } catch (error) {
            console.error('Erro ao carregar produtos disponíveis para o menu:', error);
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
