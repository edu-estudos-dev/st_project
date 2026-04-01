import connection from '../db_config/connection.js';

class FluxoDeCaixaModel {

    findAll = async () => {
        const SQL = 'SELECT * FROM lancamentos';
        const result = await connection.query(SQL);
        return result.rows;
    }

    criarFluxo = async (year) => {
        const SQL = `
            SELECT 
                tipo_de_lancamento,
                EXTRACT(MONTH FROM data) as mes,
                SUM(valor) as total
            FROM 
                lancamentos
            WHERE 
                EXTRACT(YEAR FROM data) = $1
            GROUP BY 
                tipo_de_lancamento, mes
            ORDER BY 
                tipo_de_lancamento, mes
        `;

        try {
            const result = await connection.query(SQL, [year]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao criar fluxo de caixa:', error);
            throw new Error('Erro ao criar fluxo de caixa');
        }
    }
}

export default new FluxoDeCaixaModel();