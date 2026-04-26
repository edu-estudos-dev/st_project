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
        return next();
    }

    try {
        await syncMonthlyRevenueConsolidation({ assinanteId: req.user.assinante_id });
    } catch (error) {
        console.error('Erro ao sincronizar receitas consolidadas:', error);
    }

    res.locals.navigationProducts = await EstabelecimentoModel.getMenuProdutosDisponiveis(req.user.assinante_id);
    res.locals.financialNotifications = await LancamentoModel.getNotificationAlerts(5, req.user.assinante_id);
    return next();
};
