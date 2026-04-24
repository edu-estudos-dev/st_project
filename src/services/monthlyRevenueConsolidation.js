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
let lastSyncedReferenceKey = null;

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
    bolinhas: 'bolinhas',
    figurinhas: 'figurinhas',
    pelucias: 'pelúcias'
  };

  return `Lucro Líquido das ${labels[produto] || produto} do mês ${mesTexto} no ano ${ano}`;
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

const syncPreviousMonth = async (produto, rows, referenceDate) => {
  const { ano: targetAno, mes: targetMes } = getPreviousMonthReference(referenceDate);

  for (const row of rows) {
    const ano = Number(row.ano);
    const mes = Number(row.mes);
    const total = Number(row.total || 0);

    if (!total || ano !== targetAno || mes !== targetMes) {
      continue;
    }

    await upsertConsolidatedRevenue({ produto, ano, mes, total });
  }
};

export const syncMonthlyRevenueConsolidation = async ({ referenceDate = new Date(), force = false } = {}) => {
  const now = Date.now();
  const referenceKey = getReferenceKey(getPreviousMonthReference(referenceDate));

  if (runningSync) {
    return runningSync;
  }

  if (!force && lastSyncedReferenceKey === referenceKey) {
    return;
  }

  if (!force && now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return;
  }

  runningSync = (async () => {
    const [bolinhas, figurinhas, pelucias] = await Promise.all([
      BolinhasModel.getMonthlyRevenue(),
      FigurinhasModel.getMonthlyRevenue(),
      PeluciasModel.getMonthlyRevenue()
    ]);

    await syncPreviousMonth('bolinhas', bolinhas, referenceDate);
    await syncPreviousMonth('figurinhas', figurinhas, referenceDate);
    await syncPreviousMonth('pelucias', pelucias, referenceDate);

    lastSyncAt = Date.now();
    lastSyncedReferenceKey = referenceKey;
  })().finally(() => {
    runningSync = null;
  });

  return runningSync;
};
