import connection from '../db_config/connection.js';

class PeluciasModel {

    // Cria uma nova entrada de sangria no banco de dados
    createSangria = async (sangria) => {
        const { estabelecimento_id,
            data_sangria,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes,
            leitura_atual,
            ultima_leitura = null,
            abastecido = null,
            qtde_vendido = null,
            estoque = null } = sangria;
    
        // Validação para garantir que nenhum parâmetro é undefined
        if (
            estabelecimento_id === undefined || data_sangria === undefined || valor_apurado === undefined ||
            comissao === undefined || valor_comerciante === undefined || valor_liquido === undefined ||
            tipo_pagamento === undefined || observacoes === undefined || leitura_atual === undefined ) {
            throw new Error("Parâmetros obrigatórios não podem ser undefined");
        }
    
        const query = `
        INSERT INTO sangrias_pelucias (
            estabelecimento_id,
            data_sangria, valor_apurado,
            comissao, valor_comerciante,
            valor_liquido, tipo_pagamento,
            observacoes,
            leitura_atual,
            ultima_leitura,
            abastecido,
            qtde_vendido,
            estoque)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await connection.execute(query, [
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao, valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes,
                leitura_atual,
                ultima_leitura,
                abastecido,
                qtde_vendido,
                estoque]);
            return result;
        } catch (error) {
            console.error('Erro ao criar sangria:', error);
            throw error;
        };
    };
    

    // Busca o último estoque de um estabelecimento
    getUltimoEstoque = async (estabelecimentoId) => {
        const query = `
            SELECT estoque 
            FROM sangrias_pelucias 
            WHERE estabelecimento_id = ? 
            ORDER BY data_sangria DESC 
            LIMIT 1
        `;
        try {
            const [results] = await connection.execute(query, [estabelecimentoId]);
            return results[0] || { estoque: 0 };
        } catch (error) {
            console.error('Erro ao buscar o último estoque:', error);
            throw error;
        };
    };


    // Busca a última leitura de um estabelecimento
    getUltimaLeitura = async (estabelecimentoId) => {
        const query = `
            SELECT leitura_atual AS ultima_leitura
            FROM sangrias_pelucias 
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC 
            LIMIT 1
        `;
        try {
            const [results] = await connection.execute(query, [estabelecimentoId]);
            return results[0] || { ultima_leitura: 0 };
        } catch (error) {
            console.error('Erro ao buscar a última leitura:', error);
            throw error;
        };
    };


    // Busca todas as sangrias relacionadas ao produto "Pelúcias" menos o registo inicial
    getSangrias = async () => {
        const query = `
        SELECT s.*, e.estabelecimento 
        FROM sangrias_pelucias s 
        JOIN estabelecimentos e ON s.estabelecimento_id = e.id
        WHERE UPPER(e.produto) LIKE '%PELUCIAS%'
        AND s.valor_apurado <> 0
        ORDER BY s.data_sangria DESC
    `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar sangrias:', error);
            throw error;
        };
    };


    // Busca todos os estabelecimentos com o produto "Pelúcia"
    getEstabelecimentos = async () => {
        const query = `
        SELECT * FROM estabelecimentos WHERE UPPER(produto) LIKE \'%PELUCIA%\' AND status = \'ativo\'`;
        
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar estabelecimentos:', error);
            throw error;
        };
    };


    // Busca uma sangria específica pelo ID
    getSangriaById = async (id) => {
        const query = `
            SELECT s.*, e.estabelecimento 
            FROM sangrias_pelucias s 
            JOIN estabelecimentos e ON s.estabelecimento_id = e.id
            WHERE s.id = ? AND UPPER(e.produto) LIKE '%PELUCIAS%'
        `;

        try {
            const [results] = await connection.execute(query, [id]);
            return results.length ? results[0] : null; 
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
            observacoes, leitura_atual,
            abastecido,
            qtde_vendido } = sangria;
        const query = `
        UPDATE sangrias_pelucias 
        SET
            estabelecimento_id = ?,
            data_sangria = ?,
            valor_apurado = ?,
            comissao = ?,
            valor_comerciante = ?,
            valor_liquido = ?,
            tipo_pagamento = ?,
            observacoes = ?,
            leitura_atual = ?,
            abastecido = ?,
            qtde_vendido = ?
        WHERE id = ?
            AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%')
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
                observacoes,
                leitura_atual,
                abastecido,
                qtde_vendido,
                id]);
            return result;
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            throw error;
        };
    };


    // Deleta uma sangria pelo ID
    deleteSangria = async (id) => {
        const query = `
        DELETE FROM sangrias_pelucias 
        WHERE id = ?
        AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%')
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
                sangrias_pelucias 
            WHERE estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%PELUCIAS%')
            GROUP BY 
                YEAR(data_sangria), MONTH(data_sangria)
            ORDER BY 
                YEAR(data_sangria), MONTH(data_sangria)
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao obter receita mensal:', error);
            throw error;
        };
    };


    // Obtém um relatório de controle geral dos estabelecimentos e suas últimas sangrias para PELUCIAS
    getControleGeralPelucias = async () => {
        const query = `
            SELECT 
                sp.id, 
                e.estabelecimento, 
                sp.data_sangria AS data, 
                sp.leitura_atual, 
                sp.ultima_leitura, 
                sp.abastecido, 
                sp.observacoes 
            FROM 
                estabelecimentos e 
            JOIN 
                sangrias_pelucias sp 
            ON 
                e.id = sp.estabelecimento_id 
            WHERE 
                UPPER(e.produto) LIKE '%PELUCIAS%' 
            ORDER BY 
                sp.data_sangria DESC, sp.id DESC
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar dados de controle geral das pelúcias:', error);
            throw error;
        };
    };


    // Busca a última sangria de um estabelecimento específico
    getUltimaSangria = async (estabelecimentoId) => {
        const query = `
            SELECT * 
            FROM sangrias_pelucias 
            WHERE estabelecimento_id = ? 
            ORDER BY data_sangria DESC 
            LIMIT 1
        `;
        try {
            const [results] = await connection.execute(query, [estabelecimentoId]);
            return results;
        } catch (error) {
            console.error('Erro ao buscar a última sangria:', error);
            throw error;
        };
    };


    // Atualiza a última leitura de um estabelecimento
    updateUltimaLeitura = async (estabelecimento_id, leitura_atual) => {
        const query = `
        UPDATE sangrias_pelucias
        SET ultima_leitura = ?
        WHERE estabelecimento_id = ?
        ORDER BY data_sangria DESC LIMIT 1
        `;
        try {
            const [result] = await connection.execute(query, [ 
                leitura_atual,
                estabelecimento_id]);
            return result;
        } catch (error) {
            console.error('Erro ao atualizar a última leitura:', error);
            throw error;
        };
    };


    // Busca a data da última sangria de um estabelecimento específico
    getUltimaDataSangria = async (estabelecimentoId) => {
        const query = `
            SELECT data_sangria
            FROM sangrias_pelucias 
            WHERE estabelecimento_id = ?
            ORDER BY data_sangria DESC, id DESC 
            LIMIT 1
        `;
        try {
            const [results] = await connection.execute(query, [estabelecimentoId]);
            return results[0] || { data_sangria: '1970-01-01' }; // Data padrão em caso de não haver registros
        } catch (error) {
            console.error('Erro ao buscar a data da última sangria:', error);
            throw error;
        };
    };


    // Busca todas as sangrias
    getAllSangrias = async () => {
        const query = `
            SELECT sp.id, e.estabelecimento,
                sp.data_sangria AS data,
                sp.leitura_atual,
                sp.ultima_leitura,
                sp.abastecido,
                sp.observacoes
            FROM
                sangrias_pelucias sp
            JOIN
                estabelecimentos e ON sp.estabelecimento_id = e.id
            ORDER BY
                sp.data_sangria DESC, sp.id DESC;
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar todas as sangrias:', error);
            throw error;
        };
    };


    getLatestSangriaForAllEstabelecimentos = async () => {
        const query = `
            SELECT 
                sp.id, 
                e.estabelecimento, 
                e.endereco,
                e.bairro,
                e.telefone_contato,
                sp.data_sangria AS data, 
                sp.leitura_atual, 
                sp.ultima_leitura, 
                sp.abastecido, 
                sp.estoque,
                e.maquina, 
                sp.observacoes 
            FROM 
                estabelecimentos e 
            JOIN 
                sangrias_pelucias sp 
            ON 
                e.id = sp.estabelecimento_id 
            WHERE 
                UPPER(e.produto) LIKE '%PELUCIAS%'
            AND sp.data_sangria = (
                SELECT MAX(inner_sp.data_sangria)
                FROM sangrias_pelucias inner_sp
                WHERE inner_sp.estabelecimento_id = e.id
            )
            ORDER BY 
                sp.data_sangria DESC, sp.id DESC
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar dados mais recentes:', error);
            throw error;
        };
    };

};

export default new PeluciasModel();
