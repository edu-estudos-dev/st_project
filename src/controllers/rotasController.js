import EstabelecimentoModel from '../models/estabelecimentoModel.js';

const PRODUCT_OPTIONS = [
  { value: 'todos', label: 'Todos os produtos' },
  { value: 'BOLINHAS', label: 'Bolinhas' },
  { value: 'FIGURINHAS', label: 'Figurinhas' },
  { value: 'PELUCIAS', label: 'Pelúcias' }
];

const formatProduto = produto => {
  if (!produto) return 'Não informado';

  return String(produto)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      if (item === 'BOLINHAS') return 'Bolinhas';
      if (item === 'FIGURINHAS') return 'Figurinhas';
      if (item === 'PELUCIAS') return 'Pelúcias';
      return item;
    })
    .join(' • ');
};

const buildGoogleMapsRoute = addresses => {
  if (!addresses.length) return null;

  const cleaned = addresses.map(item => encodeURIComponent(item));
  const destination = cleaned[cleaned.length - 1];
  const waypoints = cleaned.slice(0, -1);
  const baseUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${destination}`;

  return waypoints.length
    ? `${baseUrl}&waypoints=${waypoints.join('|')}`
    : baseUrl;
};

const buildWazeLink = address => {
  if (!address) return null;
  return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
};

class RotasController {
  index = async (req, res) => {
    const usuario = req.user;
    const bairro = String(req.query.bairro ?? '').trim().toUpperCase();
    const produto =
      String(req.query.produto ?? 'todos').trim().toUpperCase() || 'TODOS';

    try {
      const bairros = await EstabelecimentoModel.getRouteBairros();
      const shouldLoadPoints = Boolean(bairro);
      const routePoints = shouldLoadPoints
        ? await EstabelecimentoModel.getRoutePoints({
            bairro,
            produto: produto === 'TODOS' ? 'todos' : produto
          })
        : [];

      const addresses = routePoints
        .map(point => [point.endereco, point.bairro].filter(Boolean).join(', '))
        .filter(Boolean);

      const routeItems = routePoints.map((point, index) => {
        const address = [point.endereco, point.bairro].filter(Boolean).join(', ');
        const latitude =
          point.latitude === null || point.latitude === undefined
            ? null
            : Number(point.latitude);
        const longitude =
          point.longitude === null || point.longitude === undefined
            ? null
            : Number(point.longitude);
        const hasCoordinates =
          Number.isFinite(latitude) && Number.isFinite(longitude);

        return {
          ...point,
          latitude,
          longitude,
          hasCoordinates,
          produtoLabel: formatProduto(point.produto),
          enderecoCompleto: address || 'Endereço não informado',
          orderLabel: `${index + 1}º ponto`,
          googleMapsLink: address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
            : null,
          wazeLink: buildWazeLink(address)
        };
      });

      return res.render('pages/rotas/index', {
        title: 'Rotas dos Pontos',
        usuario,
        bairros,
        produtoOptions: PRODUCT_OPTIONS,
        selectedBairro: bairro,
        selectedProduto: produto === 'TODOS' ? 'todos' : produto,
        routeItems,
        routeSummary: {
          total: routeItems.length,
          coordinatesCoverage: routeItems.filter(item => item.hasCoordinates)
            .length,
          googleMapsLink: buildGoogleMapsRoute(addresses),
          wazeFirstStopLink: routeItems[0]?.wazeLink || null
        }
      });
    } catch (error) {
      console.error('Erro ao carregar central de rotas:', error);
      return res.status(500).send('Erro ao carregar a central de rotas.');
    }
  };
}

export default new RotasController();
