import EstabelecimentoModel from '../models/estabelecimentoModel.js';

const PRODUCT_LABELS = {
    bolinhas: 'Bolinhas',
    figurinhas: 'Figurinhas',
    pelucias: 'Pelúcias'
};

export const requireProductAvailable = (productKey) => {
    return async (req, res, next) => {
        const disponibilidade = await EstabelecimentoModel.getMenuProdutosDisponiveis(
            req.user?.assinante_id
        );

        if (disponibilidade[productKey]) {
            return next();
        }

        const productLabel = PRODUCT_LABELS[productKey] || 'Produto';
        const message = `${productLabel} não está disponível em nenhum estabelecimento ativo.`;
        const acceptsJson = req.xhr || req.get('accept')?.includes('application/json');

        if (acceptsJson) {
            return res.status(403).json({ message });
        }

        return res.redirect(`/painel?error=${encodeURIComponent(message)}`);
    };
};
