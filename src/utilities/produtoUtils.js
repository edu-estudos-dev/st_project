const PRODUTOS_VALIDOS = ['BOLINHAS', 'FIGURINHAS', 'PELUCIAS'];

const normalizeText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const normalizeProduto = (produto) => {
    const normalized = normalizeText(produto);

    if (normalized === 'PELUCIA') {
        return 'PELUCIAS';
    }

    return normalized;
};

export const normalizeSelectedProdutos = (produtos) => {
    const produtosArray = Array.isArray(produtos) ? produtos : [produtos];

    const normalized = produtosArray
        .map((produto) => normalizeProduto(produto))
        .filter((produto) => PRODUTOS_VALIDOS.includes(produto));

    return [...new Set(normalized)];
};

export const serializeProdutos = (produtos) => normalizeSelectedProdutos(produtos).join(', ');

export const parseStoredProdutos = (produtos) => normalizeSelectedProdutos(String(produtos ?? '').split(','));

export const hasProduto = (produtos, produto) => {
    const selectedProdutos = Array.isArray(produtos) ? produtos : parseStoredProdutos(produtos);
    return selectedProdutos.includes(normalizeProduto(produto));
};

export const formatProdutoLabel = (produto) => {
    const normalized = normalizeProduto(produto);
    return normalized === 'PELUCIAS' ? 'PELÚCIAS' : normalized;
};

export const formatProdutoList = (produtos) => parseStoredProdutos(produtos)
    .map((produto) => formatProdutoLabel(produto))
    .join(', ');
