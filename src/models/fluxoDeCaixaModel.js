import connection from '../db_config/connection.js'; // Importa a configuração da conexão com o banco de dados

class FluxoDeCaixaModel {

    // Método para buscar todos os lançamentos
    findAll = async () => {
        const SQL = 'SELECT * FROM lancamentos'; // Query SQL para buscar todos os lançamentos
        const [result] = await connection.execute(SQL); // Executa a query
        return result; // Retorna os resultados
    }

    // Função para criar o fluxo de caixa com ano como parâmetro
    criarFluxo = async (year) => {
        const SQL = `
            SELECT 
                tipo_de_lancamento,
                MONTH(data) as mes,
                SUM(valor) as total
            FROM 
                lancamentos
            WHERE 
                YEAR(data) = ?
            GROUP BY 
                tipo_de_lancamento, MONTH(data)
            ORDER BY 
                tipo_de_lancamento, MONTH(data)
        `;
        try {
            const [result] = await connection.execute(SQL, [year]);
            return result;
        } catch (error) {
            console.error('Erro ao criar fluxo de caixa:', error);
            throw new Error('Erro ao criar fluxo de caixa');
        }
    }
}

export default new FluxoDeCaixaModel(); // Exporta uma instância da classe FluxoDeCaixaModel
   