import connection from '../db_config/connection.js';

const formatarTexto = (texto) => {
    return texto.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
};

const getUsuarioPersistido = (usuario) => {
    if (typeof usuario === 'string') return usuario;
    return usuario?.username || null;
};

class LancamentoModel {
    constructor() {
        this.paymentColumnReady = false;
    }

    async ensurePaymentColumn() {
        if (this.paymentColumnReady) return;

        await connection.query(`
            ALTER TABLE lancamentos
            ADD COLUMN IF NOT EXISTS pago BOOLEAN NOT NULL DEFAULT FALSE
        `);

        this.paymentColumnReady = true;
    }

    async create({
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        vencimento,
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
            vencimento,
            qtde_de_parcelas,
            valor,
            descricao,
            usuario,
            dia_do_cadastro
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)
        `;

        if (
            [
                entrada_saida,
                data,
                tipo_de_lancamento,
                produto,
                forma_de_pagamento,
                qtde_de_parcelas,
                valor,
                descricao,
                usuario
            ].some((param) => param === undefined)
        ) {
            throw new Error('Parâmetros obrigatórios não podem ser undefined');
        }

        await connection.query(SQL, [
            entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            vencimento || null,
            parseInt(qtde_de_parcelas, 10),
            parseFloat(valor),
            descricao,
            getUsuarioPersistido(usuario)
        ]);
    }

    async findMonthlyConsolidatedRevenue(produto, ano, mes) {
        const SQL = `
        SELECT *
        FROM lancamentos
        WHERE entrada_saida = 'Entrada'
          AND tipo_de_lancamento = 'receita_dos_pontos'
          AND usuario = 'sistema'
          AND produto = $1
          AND EXTRACT(YEAR FROM data) = $2
          AND EXTRACT(MONTH FROM data) = $3
        ORDER BY id ASC
        `;

        const result = await connection.query(SQL, [produto, ano, mes]);
        return result.rows;
    }

    async updateConsolidatedRevenueEntry(id, { data, valor, descricao }) {
        const SQL = `
        UPDATE lancamentos
        SET
            data = $1,
            valor = $2,
            descricao = $3,
            forma_de_pagamento = 'especie',
            vencimento = NULL,
            qtde_de_parcelas = 1,
            ultima_edicao = CURRENT_TIMESTAMP
        WHERE id = $4
        `;

        await connection.query(SQL, [
            data,
            parseFloat(valor),
            descricao,
            id
        ]);
    }

    async getNotificationAlerts(daysAhead = 5) {
        await this.ensurePaymentColumn();

        const SQL = `
        SELECT *
        FROM lancamentos
        WHERE vencimento IS NOT NULL
          AND entrada_saida = 'Saida'
          AND COALESCE(pago, FALSE) = FALSE
        ORDER BY vencimento ASC, id ASC
        `;

        const result = await connection.query(SQL);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const proximos = [];
        const atrasados = [];

        result.rows.forEach((lancamento) => {
            const dueDate = new Date(lancamento.vencimento);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
            lancamento.diffDays = diffDays;

            if (diffDays >= 0 && diffDays <= daysAhead) {
                proximos.push(lancamento);
            } else if (diffDays < 0) {
                atrasados.push(lancamento);
            }
        });

        return {
            proximos,
            atrasados,
            total: proximos.length + atrasados.length
        };
    }

    findAll = async () => {
        const SQL = `
        SELECT *
        FROM lancamentos
        ORDER BY data ASC, id ASC
        `;
        const result = await connection.query(SQL);

        result.rows.forEach((lancamento) => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });

        return result.rows;
    };

    getRecentMovements = async (limit = 6) => {
        const SQL = `
        SELECT *
        FROM lancamentos
        ORDER BY COALESCE(ultima_edicao, dia_do_cadastro, data) DESC, id DESC
        LIMIT $1
        `;

        const result = await connection.query(SQL, [limit]);

        result.rows.forEach((lancamento) => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });

        return result.rows;
    };

    findById = async (id) => {
        await this.ensurePaymentColumn();

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
        vencimento,
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
            vencimento = $6,
            qtde_de_parcelas = $7,
            valor = $8,
            descricao = $9,
            ultima_edicao = CURRENT_TIMESTAMP
        WHERE id = $10
        `;

        await connection.query(SQL, [
            entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            vencimento || null,
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

    markAsPaid = async (id) => {
        await this.ensurePaymentColumn();

        const SQL = `
        UPDATE lancamentos
        SET
            pago = TRUE,
            ultima_edicao = CURRENT_TIMESTAMP
        WHERE id = $1
          AND entrada_saida = 'Saida'
          AND vencimento IS NOT NULL
        RETURNING *
        `;

        const result = await connection.query(SQL, [id]);
        return result.rows[0] || null;
    };

    search = async (query) => {
        const SQL = `
        SELECT *
        FROM lancamentos
        WHERE (
            tipo_de_lancamento ILIKE $1
            OR entrada_saida ILIKE $2
            OR descricao ILIKE $3
          )
        `;

        const likeQuery = `%${query}%`;
        const result = await connection.query(SQL, [likeQuery, likeQuery, likeQuery]);

        result.rows.forEach((lancamento) => {
            lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
        });

        return result.rows;
    };
}

export default new LancamentoModel();
