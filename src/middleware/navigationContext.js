import EstabelecimentoModel from '../models/estabelecimentoModel.js';

const defaultNavigationProducts = {
    bolinhas: false,
    figurinhas: false,
    pelucias: false,
    hasAny: false
};

export const attachNavigationContext = async (req, res, next) => {
    if (!req.user) {
        res.locals.navigationProducts = defaultNavigationProducts;
        return next();
    }

    res.locals.navigationProducts = await EstabelecimentoModel.getMenuProdutosDisponiveis();
    return next();
};
