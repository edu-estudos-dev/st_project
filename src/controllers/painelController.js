import EstabelecimentoModel from '../models/estabelecimentoModel.js';

const formatDate = value =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(value))
    : 'Sem registro';

class PainelController {
  async renderPainel(req, res) {
    const [dashboardSummary, operationalPendingItems] = await Promise.all([
      EstabelecimentoModel.getDashboardSummary(),
      EstabelecimentoModel.getOperationalPendingItems()
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

    res.render('pages/painel', {
      title: 'Painel de Controle',
      usuario: req.user,
      dashboardSummary,
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
