import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import LancamentoModel from '../models/lancamentoModel.js';
import { hasProduto } from '../utilities/produtoUtils.js';

const formatCurrency = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const formatDate = value =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(value))
    : 'Sem registro';

class RelatoriosController {
  index = async (req, res) => {
    const assinanteId = req.user.assinante_id;
    const [
      dashboardSummary,
      estabelecimentos,
      operationalPendingItems,
      recentOperationalMovements,
      lancamentos,
      financialNotifications
    ] = await Promise.all([
      EstabelecimentoModel.getDashboardSummary(assinanteId),
      EstabelecimentoModel.findAll(assinanteId),
      EstabelecimentoModel.getOperationalPendingItems(assinanteId, 7, 5),
      EstabelecimentoModel.getRecentOperationalMovements(assinanteId, 5),
      LancamentoModel.findAll(assinanteId),
      LancamentoModel.getNotificationAlerts(5, assinanteId)
    ]);

    const totalEstabelecimentos = estabelecimentos.length;
    const productDistribution = [
      {
        label: 'Bolinhas',
        value: estabelecimentos.filter(item => hasProduto(item.produto, 'BOLINHAS'))
          .length
      },
      {
        label: 'Consignados',
        value: estabelecimentos.filter(item => hasProduto(item.produto, 'FIGURINHAS'))
          .length
      },
      {
        label: 'Pelúcias',
        value: estabelecimentos.filter(item => hasProduto(item.produto, 'PELUCIAS'))
          .length
      }
    ].map(item => ({
      ...item,
      percentage: totalEstabelecimentos
        ? Math.max(8, Math.round((item.value / totalEstabelecimentos) * 100))
        : 0
    }));

    const neighborhoodMap = estabelecimentos.reduce((acc, item) => {
      const key = item.bairro || 'Sem bairro';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    const topNeighborhoods = Array.from(neighborhoodMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 5)
      .map(item => ({
        ...item,
        percentage: totalEstabelecimentos
          ? Math.max(8, Math.round((item.value / totalEstabelecimentos) * 100))
          : 0
      }));

    const coordinatesCoverage = estabelecimentos.filter(
      item => item.latitude !== null && item.longitude !== null
    ).length;
    const contactCoverage = estabelecimentos.filter(
      item => String(item.telefone_contato || '').trim() !== ''
    ).length;

    const financialSummary = lancamentos.reduce(
      (acc, item) => {
        const value = Number(item.valor || 0);
        if (item.entrada_saida === 'Entrada') acc.entradas += value;
        if (item.entrada_saida === 'Saida') acc.saidas += value;
        return acc;
      },
      { entradas: 0, saidas: 0 }
    );

    financialSummary.saldo = financialSummary.entradas - financialSummary.saidas;

    const revenueByProductMap = lancamentos.reduce((acc, item) => {
      if (item.entrada_saida !== 'Entrada') return acc;

      const key = String(item.produto || 'Sem produto').trim() || 'Sem produto';
      acc.set(key, (acc.get(key) || 0) + Number(item.valor || 0));
      return acc;
    }, new Map());

    const maxRevenue = Math.max(...Array.from(revenueByProductMap.values()), 0);

    const revenueByProduct = Array.from(revenueByProductMap.entries())
      .map(([label, value]) => ({
        label,
        value,
        formattedValue: formatCurrency(value),
        percentage: maxRevenue ? Math.max(8, Math.round((value / maxRevenue) * 100)) : 0
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 5);

    res.render('pages/relatorios/index', {
      title: 'Relatórios',
      usuario: req.user,
      dashboardSummary,
      totalEstabelecimentos,
      coordinatesCoverage,
      contactCoverage,
      productDistribution,
      topNeighborhoods,
      pendingHighlights: operationalPendingItems.map(item => ({
        ...item,
        lastSeenLabel: item.ultima_movimentacao
          ? `Última visita em ${formatDate(item.ultima_movimentacao)}`
          : 'Sem visita registrada ainda'
      })),
      recentOperationalMovements: recentOperationalMovements.map(item => ({
        ...item,
        dataLabel: formatDate(item.data_movimentacao),
        valorLabel: formatCurrency(item.valor)
      })),
      financialSummary: {
        ...financialSummary,
        entradasLabel: formatCurrency(financialSummary.entradas),
        saidasLabel: formatCurrency(financialSummary.saidas),
        saldoLabel: formatCurrency(financialSummary.saldo)
      },
      revenueByProduct,
      financialNotifications,
      alertChart: [
        {
          label: 'Próximos 5 dias',
          value: financialNotifications.proximos.length
        },
        {
          label: 'Atrasados',
          value: financialNotifications.atrasados.length
        }
      ]
    });
  };
}

export default new RelatoriosController();
