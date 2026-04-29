import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import LancamentoModel from '../models/lancamentoModel.js';
import { syncMonthlyRevenueConsolidation } from '../services/monthlyRevenueConsolidation.js';

const defaultNavigationProducts = {
    bolinhas: false,
    figurinhas: false,
    pelucias: false,
    hasAny: false
};

export const attachNavigationContext = async (req, res, next) => {
    if (!req.user) {
        res.locals.navigationProducts = defaultNavigationProducts;
        res.locals.financialNotifications = { proximos: [], atrasados: [], total: 0 };
        res.locals.operationalNotifications = { visitasAtrasadas: [], total: 0 };
        return next();
    }

    try {
        await syncMonthlyRevenueConsolidation({ assinanteId: req.user.assinante_id });
    } catch (error) {
        console.error('Erro ao sincronizar receitas consolidadas:', error);
    }

    res.locals.navigationProducts = await EstabelecimentoModel.getMenuProdutosDisponiveis(req.user.assinante_id);
    const [financialNotifications, operationalPendingItems] = await Promise.all([
        LancamentoModel.getNotificationAlerts(5, req.user.assinante_id),
        EstabelecimentoModel.getOperationalPendingItems(req.user.assinante_id, 30, 8)
    ]);

    const visitasAtrasadas = operationalPendingItems
        .filter(item => !item.ultima_movimentacao || Number(item.dias_sem_registro || 0) >= 30)
        .map(item => ({
            ...item,
            diffDays: item.ultima_movimentacao ? Number(item.dias_sem_registro || 0) : null
        }));

    res.locals.financialNotifications = financialNotifications;
    res.locals.operationalNotifications = {
        visitasAtrasadas,
        total: visitasAtrasadas.length
    };
    return next();
};
