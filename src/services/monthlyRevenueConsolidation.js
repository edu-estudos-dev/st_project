import BolinhasModel from '../models/BolinhasModel.js';
import ConsignadosModel from '../models/consignadosModel.js';
import PeluciasModel from '../models/peluciasModel.js';
import LancamentoModel from '../models/lancamentoModel.js';

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

const MIN_SYNC_INTERVAL_MS = 60 * 1000;

const runningSyncs = new Map();
const lastSyncAtByReferenceKey = new Map();
const syncedReferenceKeys = new Set();

const getLastDayOfMonth = (ano, mes) => {
  const date = new Date(Number(ano), Number(mes), 0);
  return date.toISOString().split('T')[0];
};

const getPreviousMonthReference = (referenceDate) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;

  if (month === 1) {
    return { ano: year - 1, mes: 12 };
  }

  return { ano: year, mes: month - 1 };
};

const getReferenceKey = ({ ano, mes }) => `${ano}-${String(mes).padStart(2, '0')}`;

const buildDescription = (produto, ano, mes) => {
  const mesIndex = Number(mes) - 1;
  const mesTexto = MONTH_NAMES[mesIndex] || String(mes).padStart(2, '0');
  const labels = {
    bolinhas: 'das bolinhas',
    figurinhas: 'dos consignados',
    pelucias: 'das pelucias'
  };

  return `Receita ${labels[produto] || `de ${produto}`} do mes ${mesTexto} no ano ${ano}`;
};

const upsertConsolidatedRevenue = async ({ produto, ano, mes, total, assinanteId }) => {
  if (!Number(total || 0)) {
    await LancamentoModel.deleteConsolidatedRevenueEntry(produto, ano, mes, assinanteId);
    return;
  }

  const data = getLastDayOfMonth(ano, mes);
  const descricao = buildDescription(produto, ano, mes);
  const existentes = await LancamentoModel.findMonthlyConsolidatedRevenue(produto, ano, mes, assinanteId);

  if (existentes.length > 0) {
    const keepId = existentes[0].id;

    await LancamentoModel.updateConsolidatedRevenueEntry(keepId, {
      data,
      valor: total,
      descricao
    }, assinanteId);

    if (existentes.length > 1) {
      await LancamentoModel.deleteConsolidatedRevenueDuplicates(
        produto,
        ano,
        mes,
        assinanteId,
        keepId
      );
    }

    return;
  }

  await LancamentoModel.create({
    assinante_id: assinanteId,
    entrada_saida: 'Entrada',
    data,
    tipo_de_lancamento: 'receita_dos_pontos',
    produto,
    forma_de_pagamento: 'especie',
    vencimento: null,
    qtde_de_parcelas: 1,
    valor: total,
    descricao,
    usuario: 'sistema'
  });
};

const MONTHLY_REVENUE_MODELS = {
  bolinhas: BolinhasModel,
  figurinhas: ConsignadosModel,
  pelucias: PeluciasModel
};

export const getYearMonthFromDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      ano: value.getFullYear(),
      mes: value.getMonth() + 1
    };
  }

  const match = /^(\d{4})-(\d{2})/.exec(String(value));
  if (match) {
    return {
      ano: Number(match[1]),
      mes: Number(match[2])
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    ano: date.getFullYear(),
    mes: date.getMonth() + 1
  };
};

export const recalculateConsolidatedRevenueMonth = async ({
  produto,
  ano,
  mes,
  assinanteId
}) => {
  if (!assinanteId || !produto || !ano || !mes) {
    return;
  }

  const now = new Date();
  const currentMonthKey = now.getFullYear() * 100 + now.getMonth() + 1;
  const targetMonthKey = Number(ano) * 100 + Number(mes);

  if (targetMonthKey >= currentMonthKey) {
    return;
  }

  const model = MONTHLY_REVENUE_MODELS[produto];
  if (!model) {
    return;
  }

  const rows = await model.getMonthlyRevenue(assinanteId);
  const target = rows.find(row =>
    Number(row.ano) === Number(ano) &&
    Number(row.mes) === Number(mes)
  );

  await upsertConsolidatedRevenue({
    produto,
    ano: Number(ano),
    mes: Number(mes),
    total: Number(target?.total || 0),
    assinanteId
  });
};

export const recalculateConsolidatedRevenueForDates = async ({
  produto,
  assinanteId,
  dates = []
}) => {
  const seen = new Set();

  for (const date of dates) {
    const yearMonth = getYearMonthFromDate(date);
    if (!yearMonth) continue;

    const key = `${produto}:${yearMonth.ano}:${yearMonth.mes}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await recalculateConsolidatedRevenueMonth({
      produto,
      ano: yearMonth.ano,
      mes: yearMonth.mes,
      assinanteId
    });
  }
};

const syncPreviousMonth = async (produto, rows, referenceDate, assinanteId) => {
  const { ano: targetAno, mes: targetMes } = getPreviousMonthReference(referenceDate);

  for (const row of rows) {
    const ano = Number(row.ano);
    const mes = Number(row.mes);
    const total = Number(row.total || 0);

    if (!total || ano !== targetAno || mes !== targetMes) {
      continue;
    }

    await upsertConsolidatedRevenue({ produto, ano, mes, total, assinanteId });
  }
};

export const syncMonthlyRevenueConsolidation = async ({ assinanteId, referenceDate = new Date(), force = false } = {}) => {
  if (!assinanteId) {
    return;
  }

  const now = Date.now();
  const referenceKey = `${assinanteId}:${getReferenceKey(getPreviousMonthReference(referenceDate))}`;

  if (runningSyncs.has(referenceKey)) {
    return runningSyncs.get(referenceKey);
  }

  if (!force && syncedReferenceKeys.has(referenceKey)) {
    return;
  }

  const lastSyncAt = lastSyncAtByReferenceKey.get(referenceKey) || 0;

  if (!force && now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return;
  }

  const runningSync = (async () => {
    const [bolinhas, figurinhas, pelucias] = await Promise.all([
      BolinhasModel.getMonthlyRevenue(assinanteId),
      ConsignadosModel.getMonthlyRevenue(assinanteId),
      PeluciasModel.getMonthlyRevenue(assinanteId)
    ]);

    await syncPreviousMonth('bolinhas', bolinhas, referenceDate, assinanteId);
    await syncPreviousMonth('figurinhas', figurinhas, referenceDate, assinanteId);
    await syncPreviousMonth('pelucias', pelucias, referenceDate, assinanteId);

    lastSyncAtByReferenceKey.set(referenceKey, Date.now());
    syncedReferenceKeys.add(referenceKey);
  })().finally(() => {
    runningSyncs.delete(referenceKey);
  });

  runningSyncs.set(referenceKey, runningSync);
  return runningSync;
};
