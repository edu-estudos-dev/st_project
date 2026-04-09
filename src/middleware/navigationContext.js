import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import LancamentoModel from '../models/lancamentoModel.js';

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

    res.locals.navigationProducts = await EstabelecimentoModel.getMenuProdutosDisponiveis();
    res.locals.financialNotifications = await LancamentoModel.getNotificationAlerts(5);
    return next();
};
