import connection from '../db_config/connection.js';

const formatarTexto = (texto) => {
  return String(texto || '').replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase());
};

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [datePart] = String(value).split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
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
    assinante_id,
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
        assinante_id,
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
    `;

    if (
      [
        assinante_id,
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
      throw new Error('Parametros obrigatorios nao podem ser undefined');
    }

    await connection.query(SQL, [
      assinante_id,
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

  async findMonthlyConsolidatedRevenue(produto, ano, mes, assinanteId) {
    const SQL = `
      SELECT *
      FROM lancamentos
      WHERE assinante_id = $1
        AND entrada_saida = 'Entrada'
        AND tipo_de_lancamento = 'receita_dos_pontos'
        AND usuario = 'sistema'
        AND produto = $2
        AND EXTRACT(YEAR FROM data) = $3
        AND EXTRACT(MONTH FROM data) = $4
      ORDER BY id ASC
    `;

    const result = await connection.query(SQL, [assinanteId, produto, ano, mes]);
    return result.rows;
  }

  async updateConsolidatedRevenueEntry(id, { data, valor, descricao }, assinanteId) {
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
        AND assinante_id = $5
    `;

    await connection.query(SQL, [data, parseFloat(valor), descricao, id, assinanteId]);
  }

  async getNotificationAlerts(daysAhead = 5, assinanteId) {
    await this.ensurePaymentColumn();

    const SQL = `
      SELECT *
      FROM lancamentos
      WHERE assinante_id = $1
        AND vencimento IS NOT NULL
        AND entrada_saida = 'Saida'
        AND COALESCE(pago, FALSE) = FALSE
      ORDER BY vencimento ASC, id ASC
    `;

    const result = await connection.query(SQL, [assinanteId]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const proximos = [];
    const atrasados = [];

    result.rows.forEach((lancamento) => {
      const dueDate = parseDateOnly(lancamento.vencimento);
      if (!dueDate || Number.isNaN(dueDate.getTime())) return;

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

  findAll = async (assinanteId) => {
    const SQL = `
      SELECT *
      FROM lancamentos
      WHERE assinante_id = $1
      ORDER BY data ASC, id ASC
    `;
    const result = await connection.query(SQL, [assinanteId]);

    result.rows.forEach((lancamento) => {
      lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
    });

    return result.rows;
  };

  getRecentMovements = async (assinanteId, limit = 6) => {
    const SQL = `
      SELECT *
      FROM lancamentos
      WHERE assinante_id = $1
      ORDER BY COALESCE(ultima_edicao, dia_do_cadastro, data) DESC, id DESC
      LIMIT $2
    `;

    const result = await connection.query(SQL, [assinanteId, limit]);

    result.rows.forEach((lancamento) => {
      lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
    });

    return result.rows;
  };

  findById = async (id, assinanteId) => {
    await this.ensurePaymentColumn();

    const SQL = 'SELECT * FROM lancamentos WHERE id = $1 AND assinante_id = $2';
    const result = await connection.query(SQL, [id, assinanteId]);

    if (result.rows.length > 0) {
      result.rows[0].tipo_de_lancamento = formatarTexto(result.rows[0].tipo_de_lancamento);
    }

    return result.rows[0];
  };

  async update(id, assinanteId, {
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
        AND assinante_id = $11
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
      id,
      assinanteId
    ]);
  }

  delete = async (id, assinanteId) => {
    const SQL = 'DELETE FROM lancamentos WHERE id = $1 AND assinante_id = $2';
    await connection.query(SQL, [id, assinanteId]);
  };

  markAsPaid = async (id, assinanteId) => {
    await this.ensurePaymentColumn();

    const SQL = `
      UPDATE lancamentos
      SET
        pago = TRUE,
        ultima_edicao = CURRENT_TIMESTAMP
      WHERE id = $1
        AND assinante_id = $2
        AND entrada_saida = 'Saida'
        AND vencimento IS NOT NULL
      RETURNING *
    `;

    const result = await connection.query(SQL, [id, assinanteId]);
    return result.rows[0] || null;
  };

  search = async (query, assinanteId) => {
    const SQL = `
      SELECT *
      FROM lancamentos
      WHERE assinante_id = $1
        AND (
          tipo_de_lancamento ILIKE $2
          OR entrada_saida ILIKE $3
          OR descricao ILIKE $4
        )
    `;

    const likeQuery = `%${query}%`;
    const result = await connection.query(SQL, [assinanteId, likeQuery, likeQuery, likeQuery]);

    result.rows.forEach((lancamento) => {
      lancamento.tipo_de_lancamento = formatarTexto(lancamento.tipo_de_lancamento);
    });

    return result.rows;
  };
}

export default new LancamentoModel();
