import connection from '../db_config/connection.js'; // Importa a configuração da conexão com o banco de dados

class EstabelecimentoModel {

    // Método para buscar todos os estabelecimentos ativos
    findAll = async () => {
        try {
            const SQL = 'SELECT * FROM estabelecimentos WHERE status = "ativo"';
            // Query SQL para buscar todos os estabelecimentos ativo
            const [result] = await connection.execute(SQL); // Executa a query
            return result; // Retorna os resultados
        } catch (error) {
            console.error('Erro ao executar a query:', error);
            throw new Error('Erro ao buscar estabelecimentos ativos.');
        }
    }

    // Método para buscar estabelecimentos baseado em um termo de pesquisa
    search = async (query) => {
        try {
            // Query SQL para buscar estabelecimentos ativos baseado em um termo de pesquisa
            const SQL = 'SELECT * FROM estabelecimentos WHERE (estabelecimento LIKE ? OR responsavel_nome LIKE ? OR bairro LIKE ?) AND status = "ativo"';
            const [result] = await connection.execute(SQL, [`%${query}%`, `%${query}%`, `%${query}%`]); // Executa a query com o termo de pesquisa
            return result;
        } catch (error) {
            console.error('Erro ao executar a query de busca:', error);
            throw new Error('Erro ao buscar estabelecimentos.');
        }
    }

    // Método para criar um novo estabelecimento
    create = async ({ estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes }) => {
        try {
            const SQL = `INSERT INTO estabelecimentos 
                        (estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, data_criacao, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const dateISO = new Date().toISOString(); // Obtém a data atual no formato ISO
            await connection.execute(SQL, [estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, dateISO, 'ativo']); // Executa a query com os dados fornecidos
        } catch (error) {
            console.error('Erro ao criar novo estabelecimento:', error);
            throw new Error('Erro ao criar novo estabelecimento.');
        }
    };

    // Método para atualizar um estabelecimento existente
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
            data_atualizacao = ? WHERE id = ?`; // Query SQL para atualizar um estabelecimento
        const dateISO = new Date().toISOString(); // Obtém a data atual no formato ISO
        const [result] = await connection.execute(sql, [estabelecimento, produto, chave, maquina, endereco, bairro, responsavel_nome, telefone_contato, observacoes, dateISO, id]); // Executa a query com os dados fornecidos
        return result; // Retorna o resultado da operação
    };

    // Método para buscar um estabelecimento por ID
    findById = async (id) => {
        const sql = 'SELECT * FROM estabelecimentos WHERE id = ?'; // Query SQL para buscar estabelecimento por ID
        const [result] = await connection.execute(sql, [id]); // Executa a query com o ID fornecido
        return result[0]; // Retorna o primeiro (e único) resultado
    }

    // Método para "deletar" um estabelecimento por ID (alterando o status para inativo)
    destroy = async (id) => {
        try {
            const sql = 'UPDATE estabelecimentos SET status = "inativo", data_encerramento = ? WHERE id = ?'; // Query SQL para alterar o status e definir a data de encerramento
            const dataEncerramento = new Date().toISOString(); // Captura a data e hora atuais no formato ISO
            const [result] = await connection.execute(sql, [dataEncerramento, id]); // Executa a query com o ID fornecido e a data de encerramento
            console.log('Estabelecimento marcado como inativo:', result);
        } catch (error) {
            console.error('Erro ao deletar o estabelecimento:', error);
            throw new Error('Erro ao deletar o estabelecimento.');
        }
    }

    // Método para buscar todos os bairros dos estabelecimentos que tenham o produto 'BOLINHAS'
    getBairrosByProduto = async (produto) => {
        try {
            const SQL = 'SELECT DISTINCT bairro FROM estabelecimentos WHERE UPPER(produto) LIKE ? AND status = "ativo"';
            const [result] = await connection.execute(SQL, [`%${produto.toUpperCase()}%`]);
            return result;
        } catch (error) {
            console.error('Erro ao buscar bairros:', error);
            throw new Error('Erro ao buscar bairros.');
        }
    }
}

export default new EstabelecimentoModel(); // Exporta uma instância da classe EstabelecimentoModel
