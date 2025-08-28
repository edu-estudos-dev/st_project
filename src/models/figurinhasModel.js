import connection from '../db_config/connection.js';

class FigurinhasModel {

    createSangria = async (sangria) => {
        const {
            estabelecimento_id,
            data_sangria,
            qtde_deixada,
            abastecido,
            estoque,
            qtde_vendido,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes
        } = sangria;

        if (
            estabelecimento_id === undefined || data_sangria === undefined || qtde_deixada === undefined ||
            abastecido === undefined || estoque === undefined || qtde_vendido === undefined || 
            valor_apurado === undefined || comissao === undefined || valor_comerciante === undefined ||
            valor_liquido === undefined || tipo_pagamento === undefined || observacoes === undefined
        ) {
            throw new Error("Parâmetros obrigatórios não podem ser undefined");
        }

        const query = `
        INSERT INTO sangrias_figurinhas (
            estabelecimento_id,
            data_sangria,
            qtde_deixada,
            abastecido,
            estoque,
            qtde_vendido,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await connection.execute(query, [
                estabelecimento_id,
                data_sangria,
                qtde_deixada,
                abastecido,
                estoque,
                qtde_vendido,
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

    getSangrias = async () => {
        const query = `
        SELECT s.*, e.estabelecimento 
        FROM sangrias_figurinhas s 
        JOIN estabelecimentos e ON s.estabelecimento_id = e.id
        WHERE UPPER(e.produto) LIKE '%FIGURINHAS%'
        AND s.valor_apurado <> 0
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

    getEstabelecimentos = async () => {
        const query = 'SELECT * FROM estabelecimentos WHERE UPPER(produto) LIKE \'%FIGURINHAS%\'';
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar estabelecimentos:', error);
            throw error;
        }
    };

    getSangriaById = async (id) => {
        const query = `
            SELECT s.*, e.estabelecimento 
            FROM sangrias_figurinhas s 
            JOIN estabelecimentos e ON s.estabelecimento_id = e.id
            WHERE s.id = ? AND UPPER(e.produto) LIKE '%FIGURINHAS%'
        `;

        try {
            const [results] = await connection.execute(query, [id]);
            return results.length ? results[0] : null; 
        } catch (error) {
            console.error('Erro ao buscar sangria por ID:', error);
            throw error;
        }
    };

    updateSangria = async (sangria) => {
        const {
            id,
            estabelecimento_id,
            data_sangria,
            qtde_deixada,
            abastecido,
            estoque,
            qtde_vendido,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes
        } = sangria;
        const query = `
        UPDATE sangrias_figurinhas 
        SET
            estabelecimento_id = ?,
            data_sangria = ?,
            qtde_deixada = ?,
            abastecido = ?,
            estoque = ?,
            qtde_vendido = ?,
            valor_apurado = ?,
            comissao = ?,
            valor_comerciante = ?,
            valor_liquido = ?,
            tipo_pagamento = ?,
            observacoes = ?
        WHERE id = ?
            AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%FIGURINHAS%')
    `;
        try {
            const [result] = await connection.execute(query, [
                estabelecimento_id,
                data_sangria,
                qtde_deixada,
                abastecido,
                estoque,
                qtde_vendido,
                valor_apurado,
                comissao,
                valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes,
                id]);
            return result;
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            throw error;
        }
    };

    deleteSangria = async (id) => {
        const query = `
        DELETE FROM sangrias_figurinhas 
        WHERE id = ?
        AND estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%FIGURINHAS%')
    `;
        try {
            const [result] = await connection.execute(query, [id]);
            return result;
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            throw error;
        }
    };

    getMonthlyRevenue = async () => {
        const query = `
            SELECT 
                YEAR(data_sangria) AS ano, 
                MONTH(data_sangria) AS mes, 
                SUM(valor_liquido) AS total 
            FROM 
                sangrias_figurinhas 
            WHERE estabelecimento_id IN (SELECT id FROM estabelecimentos WHERE UPPER(produto) LIKE '%FIGURINHAS%')
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
        }
    };
    
    getControleGeralFigurinhas = async () => {
        const query = `
            SELECT 
                sp.id, 
                e.estabelecimento, 
                sp.data_sangria AS data, 
                sp.qtde_deixada, 
                sp.abastecido, 
                sp.estoque, 
                sp.qtde_vendido, 
                sp.valor_apurado, 
                sp.comissao, 
                sp.valor_comerciante, 
                sp.valor_liquido, 
                sp.tipo_pagamento, 
                sp.observacoes, 
                sp.data_atualizacao 
            FROM 
                estabelecimentos e 
            JOIN 
                sangrias_figurinhas sp 
            ON 
                e.id = sp.estabelecimento_id 
            WHERE 
                UPPER(e.produto) LIKE '%FIGURINHAS%' 
            ORDER BY 
                sp.data_sangria DESC, sp.id DESC
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar dados de controle geral das figurinhas:', error);
            throw error;
        }
    };

    getUltimaSangria = async (estabelecimentoId) => {
        const query = `
            SELECT * 
            FROM sangrias_figurinhas 
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
        }
    };

    getLatestSangriaForAllEstabelecimentos = async () => {
        const query = `
            SELECT 
                sf.id, 
                e.estabelecimento, 
                e.endereco,
                e.bairro,
                e.telefone_contato,
                sf.data_sangria AS data, 
                sf.abastecido, 
                sf.estoque,
                e.maquina, 
                sf.observacoes 
            FROM 
                estabelecimentos e 
            JOIN 
                sangrias_figurinhas sf 
            ON 
                e.id = sf.estabelecimento_id 
            WHERE 
                UPPER(e.produto) LIKE '%FIGURINHAS%'
            AND sf.data_sangria = (
                SELECT MAX(inner_sf.data_sangria)
                FROM sangrias_figurinhas inner_sf
                WHERE inner_sf.estabelecimento_id = e.id
            )
            ORDER BY 
                sf.data_sangria DESC, sf.id DESC
        `;
        try {
            const [results] = await connection.execute(query);
            return results;
        } catch (error) {
            console.error('Erro ao buscar dados mais recentes:', error);
            throw error;
        }
    };
    
};

export default new FigurinhasModel();
