import connection from '../db_config/connection.js';

// Função para formatar texto removendo underscores e capitalizando palavras
const formatarTexto = (texto) => {
    return texto.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
};

class LancamentoModel {

    // Método para criar um novo lançamento
    async create({ entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        qtde_de_parcelas,
        valor,
        descricao,
        usuario }) {

        const SQL = `INSERT INTO lancamentos (
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto, forma_de_pagamento, 
        qtde_de_parcelas, valor,
        descricao,
        usuario,
        dia_do_cadastro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        if ([entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            qtde_de_parcelas,
            valor,
            descricao,
            usuario].some(param => param === undefined)) {
            throw new Error("Parâmetros obrigatórios não podem ser undefined");
        };

        try {
            await connection.execute(SQL, [
                entrada_saida,
                data,
                tipo_de_lancamento,
                produto,
                forma_de_pagamento,
                parseInt(qtde_de_parcelas),
                parseFloat(valor),
                descricao,
                usuario.username
            ]);
        } catch (error) {
            console.error('Erro ao adicionar lançamento:', error);
            throw error;
        }
    }


    // Método para atualizar o vencimento
    async updateVencimento(id, vencimento) {
        const SQL = `
        UPDATE
            lancamentos
        SET
            vencimento = ?,
            ultima_edicao = NOW()
        WHERE id = ?
        `;

        try {
            await connection.execute(SQL, [vencimento, id]);
        }
        catch (error) {
            console.error('Erro ao atualizar vencimento:', error);
            throw error;
        }
    }


    // Método para buscar todos os lançamentos
    findAll = async () => {
        const SQL = 'SELECT * FROM lancamentos';
        const [result] = await connection.execute(SQL);
        result.forEach(lancamento => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });
        return result;
    };


    // Método para buscar um lançamento por ID
    findById = async (id) => {
        const SQL = 'SELECT * FROM lancamentos WHERE id = ?';
        const [result] = await connection.execute(SQL, [id]);
        if (result.length > 0) {
            result[0].tipo_de_lancamento = formatarTexto(result[0].tipo_de_lancamento);
        }
        return result[0];
    };


    // Método para atualizar um lançamento
    async update(id, {
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        qtde_de_parcelas,
        valor,
        descricao }) {
        const SQL = `
        UPDATE
            lancamentos
        SET
            entrada_saida = ?,
            data = ?,
            tipo_de_lancamento = ?,
            produto = ?,
            forma_de_pagamento = ?,
            qtde_de_parcelas = ?,
            valor = ?,
            descricao = ?,
            ultima_edicao = NOW()
        WHERE
            id = ?
            `;
        try {
            await connection.execute(SQL, [
                entrada_saida,
                data,
                tipo_de_lancamento,
                produto,
                forma_de_pagamento,
                qtde_de_parcelas,
                parseFloat(valor),
                descricao,
                id
            ]);
        } catch (error) {
            console.error('Erro ao editar lançamento:', error);
            throw error;
        }
    }


    // Método para deletar um lançamento
    delete = async (id) => {
        const SQL = 'DELETE FROM lancamentos WHERE id = ?';
        await connection.execute(SQL, [id]);
    };

    
    // Método para buscar lançamentos baseado em um termo de pesquisa
    search = async (query) => {
        const SQL = `
        SELECT
            *
        FROM
            lancamentos
        WHERE
            tipo_de_lancamento LIKE ?
        OR
            entrada_saida
        LIKE ?
        `;
        const [result] = await connection.execute(SQL, [`%${query}%`, `%${query}%`]);
        result.forEach(lancamento => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });
        return result;
    }
}

export default new LancamentoModel();
