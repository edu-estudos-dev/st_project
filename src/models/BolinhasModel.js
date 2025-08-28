import connection from '../db_config/connection.js';

class BolinhasModel {

    // Cria uma nova entrada de sangria no banco de dados
    createSangria = async (sangria) => {
        const { estabelecimento_id,
            data_sangria,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes } = sangria;

        const query = `
            INSERT INTO sangrias_bolinha (
            estabelecimento_id,
            data_sangria,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            const [result] = await connection.execute(query, [
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes]);
            return result;
        } catch (error) {
            console.error('Erro ao criar sangria:', error);
            throw error;
        }
    };


    // Busca todas as sangrias relacionadas ao produto "Bolinha"
    getSangrias = async () => {
        const query = `
            SELECT s.*, e.estabelecimento 
            FROM sangrias_bolinha s 
            JOIN estabelecimentos e ON s.estabelecimento_id = e.id
            WHERE UPPER(e.produto) LIKE '%BOLINHAS%'
            ORDER BY s.data_sangria DESC 
        `;

        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar sangrias:', error);
            throw error;
        }
    };


    // Busca uma sangria específica pelo ID
    getSangriaById = async (id) => {
        const query = `
            SELECT s.*, e.estabelecimento 
            FROM sangrias_bolinha s 
            JOIN estabelecimentos e ON s.estabelecimento_id = e.id
            WHERE s.id = ? AND UPPER(e.produto) LIKE '%BOLINHAS%'
        `;

        try {
            const [results] = await connection.execute(query, [id]);
            return results;
        } catch (error) {
            console.error('Erro ao buscar sangria por ID:', error);
            throw error;
        };
    };


    // Atualiza uma entrada de sangria existente no banco de dados
    updateSangria = async (sangria) => {
        const { id,
            estabelecimento_id,
            data_sangria,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes } = sangria;

        const query = `
            UPDATE sangrias_bolinha 
            SET estabelecimento_id = ?,
            data_sangria = ?,
            valor_apurado = ?,
            comissao = ?,
            valor_comerciante = ?,
            valor_liquido = ?,
            tipo_pagamento = ?,
            observacoes = ?
            WHERE id = ? AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%BOLINHAS%')
        `;

        try {
            const [result] = await connection.execute(query, [
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes, id]);
            return result;
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            throw error;
        }
    };


    // Deleta uma sangria pelo ID
    deleteSangria = async (id) => {
        const query = `
            DELETE FROM sangrias_bolinha 
            WHERE id = ? AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%BOLINHAS%')
        `;

        try {
            const [result] = await connection.execute(query, [id]);
            return result;
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            throw error;
        };
    };


    // Obtém a receita mensal agrupada por ano e mês
    getMonthlyRevenue = async () => {
        const query = `
            SELECT 
                YEAR(data_sangria) AS ano, 
                MONTH(data_sangria) AS mes, 
                SUM(valor_liquido) AS total 
            FROM 
                sangrias_bolinha 
            WHERE estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%BOLINHAS%')
            GROUP BY 
                YEAR(data_sangria), MONTH(data_sangria)
            ORDER BY 
                YEAR(data_sangria), MONTH(data_sangria);
        `;

        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao obter receita mensal:', error);
            throw error;
        };
    };


    // Busca todos os estabelecimentos com o produto "Bolinha"
    getEstabelecimentos = async () => {
        const query = 'SELECT * FROM estabelecimentos WHERE UPPER(produto) LIKE \'%BOLINHAS%\'';

        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar estabelecimentos:', error);
            throw error;
        };
    };


    // Obtém um relatório de controle geral dos estabelecimentos e suas últimas sangrias
    getControleGeral = async () => {
        const query = `
            SELECT 
                e.id, 
                e.estabelecimento, 
                e.chave, 
                e.maquina, 
                e.endereco, 
                e.bairro,
                e.telefone_contato,
                MAX(s.data_sangria) AS data 
            FROM 
                estabelecimentos e 
            JOIN 
                sangrias_bolinha s 
            ON 
                e.id = s.estabelecimento_id 
            WHERE 
                UPPER(e.produto) LIKE '%BOLINHAS%'
            GROUP BY 
                e.id, e.estabelecimento, e.chave, e.maquina, e.endereco, e.bairro, e.telefone_contato
        `;

        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar dados de controle geral:', error);
            throw error;
        };
    };
};

export default new BolinhasModel();
