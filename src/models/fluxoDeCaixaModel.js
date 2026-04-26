import connection from '../db_config/connection.js';

class FluxoDeCaixaModel {

    findAll = async (assinanteId) => {
        const SQL = 'SELECT * FROM lancamentos WHERE assinante_id = $1';
        const result = await connection.query(SQL, [assinanteId]);
        return result.rows;
    }

    criarFluxo = async (year, assinanteId) => {
        const SQL = `
            SELECT 
                tipo_de_lancamento,
                EXTRACT(MONTH FROM COALESCE(vencimento, data)) as mes,
                SUM(valor) as total
            FROM 
                lancamentos
            WHERE 
                assinante_id = $1
                AND EXTRACT(YEAR FROM COALESCE(vencimento, data)) = $2
            GROUP BY 
                tipo_de_lancamento, mes
            ORDER BY 
                tipo_de_lancamento, mes
        `;

        try {
            const result = await connection.query(SQL, [assinanteId, year]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao criar fluxo de caixa:', error);
            throw new Error('Erro ao criar fluxo de caixa');
        }
    }
}

export default new FluxoDeCaixaModel();
