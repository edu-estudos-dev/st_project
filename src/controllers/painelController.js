import EstabelecimentoModel from '../models/estabelecimentoModel.js';

const formatDate = value =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(value))
    : 'Sem registro';

const formatCurrency = value =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const formatPercent = value => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Sem base anterior';
  }

  const number = Number(value);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(1).replace('.', ',')}%`;
};

const getTrendTone = value => {
  const number = Number(value || 0);
  if (number > 0) return 'positive';
  if (number < 0) return 'negative';
  return 'neutral';
};

class PainelController {
  async renderPainel(req, res) {
    const assinanteId = req.user.assinante_id;
    const [dashboardSummary, dashboardInsights, operationalPendingItems] = await Promise.all([
      EstabelecimentoModel.getDashboardSummary(assinanteId),
      EstabelecimentoModel.getDashboardInsights(assinanteId),
      EstabelecimentoModel.getOperationalPendingItems(assinanteId)
    ]);

    const criticalVisitItems = operationalPendingItems
      .filter(item => !item.ultima_movimentacao || Number(item.dias_sem_registro || 0) >= 30)
      .sort((a, b) => Number(b.dias_sem_registro || 9999) - Number(a.dias_sem_registro || 9999))
      .slice(0, 5)
      .map(item => ({
        ...item,
        lastSeenLabel: item.ultima_movimentacao
          ? `Última visita em ${formatDate(item.ultima_movimentacao)}`
          : 'Esse ponto ainda não recebeu a primeira visita.',
        daysLabel: item.ultima_movimentacao
          ? `${item.dias_sem_registro} dia(s) sem sangria`
          : 'Sem nenhuma sangria registrada',
        actionHref: item.action_href
      }));

    const visitAlert = criticalVisitItems.length
      ? {
          tone: 'danger',
          title: `${criticalVisitItems.length} ponto(s) estão há mais de 30 dias sem visita`,
          description:
            'Esses estabelecimentos precisam de atenção porque estão há muito tempo sem sangria registrada.',
          items: criticalVisitItems,
          actionHref: criticalVisitItems[0]?.actionHref || '/estabelecimentos',
          actionLabel: 'Ir para o registro'
        }
      : {
          tone: 'safe',
          title: 'Nenhum ponto crítico sem visita',
          description:
            'No momento não há estabelecimentos com mais de 30 dias sem sangria no painel.',
          items: [],
          actionHref: '/estabelecimentos',
          actionLabel: 'Ver estabelecimentos'
        };

    const insightTotals = dashboardInsights.totals || {};
    const revenueDelta = Number(insightTotals.delta || 0);
    const revenueDeltaPercent = insightTotals.deltaPercent;
    const revenueDirection = getTrendTone(revenueDelta);
    const recommendedAction = dashboardInsights.recommendedAction;
    const recommendedActionCard = recommendedAction
      ? {
          title: recommendedAction.estabelecimento || 'Ponto em atenção',
          product: recommendedAction.produto || 'Operação',
          description: recommendedAction.daysWithoutVisit !== undefined
            ? `${recommendedAction.daysWithoutVisit} dia(s) sem visita e ${formatCurrency(recommendedAction.estimatedValue)} estimados em aberto.`
            : recommendedAction.delta !== undefined
              ? `${formatCurrency(Math.abs(recommendedAction.delta))} de queda frente ao mês anterior.`
              : `${formatCurrency(recommendedAction.total || 0)} acumulados no mês.`,
          href: '/rotas'
        }
      : null;

    const formattedInsights = {
      totals: {
        ...insightTotals,
        currentLabel: formatCurrency(insightTotals.current),
        previousLabel: formatCurrency(insightTotals.previous),
        deltaLabel: `${revenueDelta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(revenueDelta))}`,
        deltaPercentLabel: formatPercent(revenueDeltaPercent),
        averagePerVisitLabel: formatCurrency(insightTotals.averagePerVisit),
        revenueDirection
      },
      productBreakdown: (dashboardInsights.productBreakdown || []).map(item => ({
        ...item,
        totalLabel: formatCurrency(item.total),
        percentLabel: `${Math.round(item.percent || 0)}%`,
        averageLabel: formatCurrency(item.visits ? item.total / item.visits : 0)
      })),
      topPoints: (dashboardInsights.topPoints || []).map((item, index) => ({
        ...item,
        position: index + 1,
        totalLabel: formatCurrency(item.total),
        averageLabel: formatCurrency(item.visits ? item.total / item.visits : 0)
      })),
      pointTrends: (dashboardInsights.pointTrends || []).map(item => ({
        ...item,
        tone: getTrendTone(item.delta),
        currentLabel: formatCurrency(item.currentTotal),
        previousLabel: formatCurrency(item.previousTotal),
        deltaLabel: `${item.delta >= 0 ? '+' : '-'}${formatCurrency(Math.abs(item.delta))}`,
        deltaPercentLabel: formatPercent(item.deltaPercent)
      })),
      staleValue: {
        totalEstimated: dashboardInsights.staleValue?.totalEstimated || 0,
        totalEstimatedLabel: formatCurrency(dashboardInsights.staleValue?.totalEstimated || 0),
        items: (dashboardInsights.staleValue?.items || []).map(item => ({
          ...item,
          estimatedValueLabel: formatCurrency(item.estimatedValue),
          averageDailyLabel: formatCurrency(item.averageDaily),
          lastMovementLabel: item.lastMovement ? formatDate(item.lastMovement) : 'Sem visita'
        }))
      },
      cashFlow: {
        ...(dashboardInsights.cashFlow || {}),
        entradasLabel: formatCurrency(dashboardInsights.cashFlow?.entradas || 0),
        saidasLabel: formatCurrency(dashboardInsights.cashFlow?.saidas || 0),
        saldoLabel: `${Number(dashboardInsights.cashFlow?.saldo || 0) >= 0 ? '+' : '-'}${formatCurrency(Math.abs(dashboardInsights.cashFlow?.saldo || 0))}`,
        saldoTone: getTrendTone(dashboardInsights.cashFlow?.saldo || 0),
        pendenteSaidasLabel: formatCurrency(dashboardInsights.cashFlow?.pendenteSaidas || 0),
        atrasadoSaidasLabel: formatCurrency(dashboardInsights.cashFlow?.atrasadoSaidas || 0),
        comprometimentoLabel: formatPercent(dashboardInsights.cashFlow?.comprometimentoPercent)
      },
      recommendedAction: recommendedActionCard
    };

    res.render('pages/painel', {
      title: 'Painel de Controle',
      usuario: req.user,
      dashboardSummary,
      dashboardInsights: formattedInsights,
      dashboardVisitAlert: visitAlert,
      financialNotifications:
        res.locals.financialNotifications || {
          proximos: [],
          atrasados: [],
          total: 0
        }
    });
  }
}

export default new PainelController();
