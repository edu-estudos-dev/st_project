import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';

const PRODUCT_OPTIONS = [
  { value: 'todos', label: 'Todos os produtos' },
  { value: 'BOLINHAS', label: 'Bolinhas' },
  { value: 'FIGURINHAS', label: 'Consignados' },
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
      if (item === 'FIGURINHAS') return 'Consignados';
      if (item === 'PELUCIAS') return 'Pelúcias';
      return item;
    })
    .join(' • ');
};

const extractProdutosFromString = produto => {
  if (!produto) return [];

  return String(produto)
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(item => ['BOLINHAS', 'FIGURINHAS', 'PELUCIAS'].includes(item));
};

const filterProdutosByRouteFilter = (produtos, produtoFiltro = 'todos') => {
  const filtro = String(produtoFiltro || 'todos')
    .trim()
    .toUpperCase();

  if (!Array.isArray(produtos)) return [];

  if (filtro === 'TODOS' || filtro === 'ALL') {
    return produtos;
  }

  return produtos.filter(produto => produto === filtro);
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

    const rawBairros = Array.isArray(req.query.bairros)
      ? req.query.bairros
      : Array.isArray(req.query.bairro)
        ? req.query.bairro
        : [req.query.bairros ?? req.query.bairro].filter(Boolean);

    const selectedBairros = rawBairros
      .map(item =>
        String(item ?? '')
          .trim()
          .toUpperCase()
      )
      .filter(Boolean);

    const bairro = selectedBairros[0] || '';

    const produto =
      String(req.query.produto ?? 'todos')
        .trim()
        .toUpperCase() || 'TODOS';

    try {
      const bairros = await EstabelecimentoModel.getRouteBairros(
        usuario.assinante_id
      );

      const navigationProducts = res.locals.navigationProducts || {};

      const produtoOptions = PRODUCT_OPTIONS.filter(option => {
        if (option.value === 'todos') return true;
        return Boolean(navigationProducts[option.value.toLowerCase()]);
      });

      const shouldLoadPoints = selectedBairros.length > 0;

      const routePoints = shouldLoadPoints
        ? await EstabelecimentoModel.getRoutePoints({
            bairros: selectedBairros,
            produto: produto === 'TODOS' ? 'todos' : produto,
            assinanteId: usuario.assinante_id
          })
        : [];

      const addresses = routePoints
        .map(point => [point.endereco, point.bairro].filter(Boolean).join(', '))
        .filter(Boolean);

      const routeItems = routePoints.map((point, index) => {
        const address = [point.endereco, point.bairro]
          .filter(Boolean)
          .join(', ');

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

      const googleMapsEmbedApiKey = process.env.GOOGLE_MAPS_EMBED_API_KEY || '';

      const canUseGoogleMapsEmbed = [
        'vendmaster.com.br',
        'www.vendmaster.com.br'
      ].includes(req.hostname);

      return res.render('pages/rotas/index', {
        title: 'Rotas dos Pontos',
        usuario,
        bairros,
        produtoOptions,
        selectedBairro: bairro,
        selectedBairros,
        selectedProduto: produto === 'TODOS' ? 'todos' : produto,
        routeItems,
        googleMapsEmbedApiKey: canUseGoogleMapsEmbed
          ? googleMapsEmbedApiKey
          : '',
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

  iniciarRotaOperacional = async (req, res) => {
    const usuario = req.user;

    try {
      const {
        bairros = [],
        produto = 'todos',
        origem_latitude = null,
        origem_longitude = null,
        pontos = []
      } = req.body;

      if (!Array.isArray(pontos) || pontos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum ponto foi enviado para iniciar a rota.'
        });
      }

      const usuarioId = usuario.id || usuario.usuario_id || null;

      const rota = await RotasOperacionaisModel.createRota({
        assinante_id: usuario.assinante_id,
        usuario_id: usuarioId,
        produto_filtro: produto,
        bairros,
        origem_latitude,
        origem_longitude
      });

      const pontosDaRota = await RotasOperacionaisModel.createRotaPontos({
        rota_id: rota.id,
        assinante_id: usuario.assinante_id,
        pontos: pontos.map((ponto, index) => ({
          estabelecimento_id: ponto.estabelecimento_id || ponto.id,
          ordem: ponto.ordem || index + 1
        }))
      });

      return res.status(201).json({
        success: true,
        message: 'Rota operacional iniciada com sucesso.',
        rota,
        pontos: pontosDaRota
      });
    } catch (error) {
      console.error('Erro ao iniciar rota operacional:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao iniciar rota operacional.'
      });
    }
  };

  registrarChegadaPonto = async (req, res) => {
    const usuario = req.user;

    try {
      const { rotaPontoId } = req.params;

      const {
        latitude_chegada = null,
        longitude_chegada = null,
        retorno_url = '/rotas'
      } = req.body;

      const pontoDaRota = await RotasOperacionaisModel.findPontoDaRotaById(
        rotaPontoId,
        usuario.assinante_id
      );

      if (!pontoDaRota) {
        return res.status(404).json({
          success: false,
          message: 'Ponto da rota não encontrado.'
        });
      }

      const rotaOperacional = pontoDaRota.rota_id
        ? await RotasOperacionaisModel.findRotaById(
            pontoDaRota.rota_id,
            usuario.assinante_id
          )
        : null;

      const produtosDoPonto = extractProdutosFromString(pontoDaRota.produto);

      const produtos = filterProdutosByRouteFilter(
        produtosDoPonto,
        rotaOperacional?.produto_filtro || 'todos'
      );

      if (!produtos.length) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum produto deste ponto corresponde ao filtro da rota.'
        });
      }

      const pontoAtualizado =
        await RotasOperacionaisModel.marcarPontoEmAndamento({
          rota_ponto_id: rotaPontoId,
          assinante_id: usuario.assinante_id,
          latitude_chegada,
          longitude_chegada
        });

      if (!pontoAtualizado) {
        return res.status(400).json({
          success: false,
          message: 'Não foi possível iniciar a visita deste ponto.'
        });
      }

      const usuarioId = usuario.id || usuario.usuario_id || null;

      const visita = await VisitasModel.createOrGetVisitaEmAndamento({
        rota_id: pontoDaRota.rota_id,
        rota_ponto_id: pontoDaRota.id,
        assinante_id: usuario.assinante_id,
        estabelecimento_id: pontoDaRota.estabelecimento_id,
        usuario_id: usuarioId,
        latitude_chegada,
        longitude_chegada
      });

      const visitaProdutos = await VisitasModel.iniciarProdutosDaVisita({
        visita_id: visita.id,
        assinante_id: usuario.assinante_id,
        produtos
      });

      const retornoUrlSeguro = String(retorno_url || '/rotas').startsWith(
        '/rotas'
      )
        ? String(retorno_url || '/rotas')
        : '/rotas';

      let redirectUrl = `/rotas/visitas/${visita.id}`;

      if (produtos.length === 1) {
        const queryParams = new URLSearchParams({
          estabelecimento_id: String(pontoDaRota.estabelecimento_id),
          visita_id: String(visita.id),
          rota_id: String(pontoDaRota.rota_id),
          rota_ponto_id: String(pontoDaRota.id),
          origem: 'rota',
          retorno_url: retornoUrlSeguro,
          rota_retorno_url: retornoUrlSeguro
        });

        if (produtos[0] === 'BOLINHAS') {
          redirectUrl = `/bolinhas/sangrias/add?${queryParams.toString()}`;
        }

        if (produtos[0] === 'FIGURINHAS') {
          redirectUrl = `/figurinhas/sangrias/add?${queryParams.toString()}`;
        }

        if (produtos[0] === 'PELUCIAS') {
          redirectUrl = `/pelucias/sangrias/add?${queryParams.toString()}`;
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Chegada registrada. Visita iniciada.',
        ponto: pontoAtualizado,
        visita,
        produtos: visitaProdutos,
        redirectUrl
      });
    } catch (error) {
      console.error('Erro ao registrar chegada ao ponto:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao registrar chegada ao ponto.'
      });
    }
  };

  visitaPonto = async (req, res) => {
    const usuario = req.user;

    try {
      const { visitaId } = req.params;

      const visita = await VisitasModel.findVisitaCompletaById(
        visitaId,
        usuario.assinante_id
      );

      if (!visita) {
        return res.status(404).send('Visita não encontrada.');
      }

      const rotaPonto = visita.rota_ponto_id
        ? await RotasOperacionaisModel.findPontoDaRotaById(
            visita.rota_ponto_id,
            usuario.assinante_id
          )
        : null;

      const rotaOperacional = visita.rota_id
        ? await RotasOperacionaisModel.findRotaById(
            visita.rota_id,
            usuario.assinante_id
          )
        : null;

      let rotaRetornoUrl = '/rotas';

      if (rotaOperacional) {
        const params = new URLSearchParams();

        params.set('produto', rotaOperacional.produto_filtro || 'todos');

        String(rotaOperacional.bairros || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .forEach(bairro => {
            params.append('bairros', bairro);
          });

        rotaRetornoUrl = `/rotas?${params.toString()}`;
      }

      const produtosDoPonto = extractProdutosFromString(visita.produto);

      const produtosFiltradosDaRota = filterProdutosByRouteFilter(
        produtosDoPonto,
        rotaOperacional?.produto_filtro || 'todos'
      );

      const produtosStatusMap = new Map(
        (visita.produtos || []).map(produto => [produto.produto, produto])
      );

      const produtosDaVisita = produtosFiltradosDaRota.map(produto => {
        const registro = produtosStatusMap.get(produto);

        let label = produto;

        if (produto === 'BOLINHAS') label = 'Bolinhas';
        if (produto === 'FIGURINHAS') label = 'Consignados';
        if (produto === 'PELUCIAS') label = 'Pelúcias';

        return {
          produto,
          label,
          status: registro?.status || 'pendente',
          sangria_id: registro?.sangria_id || null,
          observacoes: registro?.observacoes || ''
        };
      });

      return res.render('pages/rotas/visitaPonto', {
        title: 'Visita Guiada',
        usuario,
        visita,
        rotaPonto,
        rotaOperacional,
        rotaRetornoUrl,
        produtosDaVisita
      });
    } catch (error) {
      console.error('Erro ao carregar visita guiada:', error);
      return res.status(500).send('Erro ao carregar visita guiada.');
    }
  };
}

export default new RotasController();