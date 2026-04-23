import BolinhasModel from '../models/BolinhasModel.js';
import FigurinhasModel from '../models/figurinhasModel.js';
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

let runningSync = null;
let lastSyncAt = 0;

const isClosedMonth = (ano, mes, referenceDate) => {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  return Number(ano) < currentYear || (Number(ano) === currentYear && Number(mes) < currentMonth);
};

const getLastDayOfMonth = (ano, mes) => {
  const date = new Date(Number(ano), Number(mes), 0);
  return date.toISOString().split('T')[0];
};

const buildDescription = (produto, ano, mes) => {
  const mesIndex = Number(mes) - 1;
  const mesTexto = MONTH_NAMES[mesIndex] || String(mes).padStart(2, '0');
  return `Receita consolidada do produto ${produto} referente a ${mesTexto}/${ano}.`;
};

const upsertConsolidatedRevenue = async ({ produto, ano, mes, total }) => {
  const data = getLastDayOfMonth(ano, mes);
  const descricao = buildDescription(produto, ano, mes);
  const existentes = await LancamentoModel.findMonthlyConsolidatedRevenue(produto, ano, mes);

  if (existentes.length > 0) {
    await LancamentoModel.updateConsolidatedRevenueEntry(existentes[0].id, {
      data,
      valor: total,
      descricao
    });
    return;
  }

  await LancamentoModel.create({
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

const syncClosedMonths = async (produto, rows, referenceDate) => {
  for (const row of rows) {
    const ano = Number(row.ano);
    const mes = Number(row.mes);
    const total = Number(row.total || 0);

    if (!total || !isClosedMonth(ano, mes, referenceDate)) {
      continue;
    }

    await upsertConsolidatedRevenue({ produto, ano, mes, total });
  }
};

export const syncMonthlyRevenueConsolidation = async () => {
  const now = Date.now();

  if (runningSync) {
    return runningSync;
  }

  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return;
  }

  runningSync = (async () => {
    const referenceDate = new Date();
    const [bolinhas, figurinhas, pelucias] = await Promise.all([
      BolinhasModel.getMonthlyRevenue(),
      FigurinhasModel.getMonthlyRevenue(),
      PeluciasModel.getMonthlyRevenue()
    ]);

    await syncClosedMonths('bolinhas', bolinhas, referenceDate);
    await syncClosedMonths('figurinhas', figurinhas, referenceDate);
    await syncClosedMonths('pelucias', pelucias, referenceDate);

    lastSyncAt = Date.now();
  })().finally(() => {
    runningSync = null;
  });

  return runningSync;
};
