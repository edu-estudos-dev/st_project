import connection from '../db_config/connection.js';

class FluxoDeCaixaModel {

    findAll = async (assinanteId) => {
        const SQL = 'SELECT * FROM lancamentos WHERE assinante_id = $1';
        const result = await connection.query(SQL, [assinanteId]);
        return result.rows;
    }

    criarFluxo = async (year, assinanteId) => {
        const normalizedYear = Number(year);

        if (!Number.isInteger(normalizedYear)) {
            throw new Error('Ano invalido para fluxo de caixa');
        }

        const start = `${normalizedYear}-01-01`;
        const end = `${normalizedYear + 1}-01-01`;

        const SQL = `
            SELECT 
                tipo_de_lancamento,
                EXTRACT(MONTH FROM COALESCE(vencimento, data)) as mes,
                SUM(valor) as total
            FROM 
                lancamentos
            WHERE 
                assinante_id = $1
                AND COALESCE(vencimento, data) >= $2::date
                AND COALESCE(vencimento, data) < $3::date
            GROUP BY 
                tipo_de_lancamento, mes
            ORDER BY 
                tipo_de_lancamento, mes
        `;

        try {
            const result = await connection.query(SQL, [assinanteId, start, end]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao criar fluxo de caixa:', error);
            throw new Error('Erro ao criar fluxo de caixa');
        }
    }
}

export default new FluxoDeCaixaModel();
