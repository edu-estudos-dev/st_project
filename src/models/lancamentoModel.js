import connection from '../db_config/connection.js';

// Função para formatar texto
const formatarTexto = (texto) => {
    return texto.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
};

class LancamentoModel {

    async create({
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        qtde_de_parcelas,
        valor,
        descricao,
        usuario
    }) {

        const SQL = `
        INSERT INTO lancamentos (
            entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento, 
            qtde_de_parcelas,
            valor,
            descricao,
            usuario,
            dia_do_cadastro
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
        `;

        if ([entrada_saida, data, tipo_de_lancamento, produto,
            forma_de_pagamento, qtde_de_parcelas, valor,
            descricao, usuario].some(param => param === undefined)) {
            throw new Error("Parâmetros obrigatórios não podem ser undefined");
        }

        await connection.query(SQL, [
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
    }

    async updateVencimento(id, vencimento) {
        const SQL = `
        UPDATE lancamentos
        SET
            vencimento = $1,
            ultima_edicao = CURRENT_TIMESTAMP
        WHERE id = $2
        `;

        await connection.query(SQL, [vencimento, id]);
    }

    findAll = async () => {
        const SQL = 'SELECT * FROM lancamentos';
        const result = await connection.query(SQL);

        result.rows.forEach(lancamento => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });

        return result.rows;
    };

    findById = async (id) => {
        const SQL = 'SELECT * FROM lancamentos WHERE id = $1';
        const result = await connection.query(SQL, [id]);

        if (result.rows.length > 0) {
            result.rows[0].tipo_de_lancamento = formatarTexto(result.rows[0].tipo_de_lancamento);
        }

        return result.rows[0];
    };

    async update(id, {
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        qtde_de_parcelas,
        valor,
        descricao
    }) {

        const SQL = `
        UPDATE lancamentos
        SET
            entrada_saida = $1,
            data = $2,
            tipo_de_lancamento = $3,
            produto = $4,
            forma_de_pagamento = $5,
            qtde_de_parcelas = $6,
            valor = $7,
            descricao = $8,
            ultima_edicao = CURRENT_TIMESTAMP
        WHERE id = $9
        `;

        await connection.query(SQL, [
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
    }

    delete = async (id) => {
        const SQL = 'DELETE FROM lancamentos WHERE id = $1';
        await connection.query(SQL, [id]);
    };

    search = async (query) => {
        const SQL = `
        SELECT *
        FROM lancamentos
        WHERE tipo_de_lancamento ILIKE $1
        OR entrada_saida ILIKE $2
        `;

        const result = await connection.query(SQL, [`%${query}%`, `%${query}%`]);

        result.rows.forEach(lancamento => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });

        return result.rows;
    };
}

export default new LancamentoModel();