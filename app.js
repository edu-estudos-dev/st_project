import express from 'express';
import compression from 'compression';
import path from 'path';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import dotenv from 'dotenv';
import isAuthenticated, {
  attachAuthenticatedUser
} from './src/middleware/isAuthenticated.js';
import {
  attachCsrfToken,
  requireCsrfProtection
} from './src/middleware/csrfMiddleware.js';
import { attachNavigationContext } from './src/middleware/navigationContext.js';
import { requireProductAvailable } from './src/middleware/productAvailability.js';
import {
  disableAuthenticatedCache,
  securityHeaders
} from './src/middleware/securityMiddleware.js';
import {
  attachSubscriptionStatus,
  requireReadableSubscription
} from './src/middleware/subscriptionStatus.js';

import loginLogoutRoutes from './src/routes/loginLogoutRoutes.js';
import homepageRoutes from './src/routes/homepageRoutes.js';
import blogRoutes from './src/routes/blogRoutes.js';
import sitemapRoutes from './src/routes/sitemapRoutes.js';
import legacyAssetRoutes from './src/routes/legacyAssetRoutes.js';
import estabelecimentoRoutes from './src/routes/estabelecimentoRoutes.js';
import lancamentoRoutes from './src/routes/lancamentoRoutes.js';
import searchRoutes from './src/routes/searchRoutes.js';
import painelRoutes from './src/routes/painelRoutes.js';
import interessadosRoutes from './src/routes/interessadosRoutes.js';
import fluxoDeCaixaRoutes from './src/routes/fluxoDeCaixaRoutes.js';
import rotasRoutes from './src/routes/rotasRoutes.js';
import relatoriosRoutes from './src/routes/relatoriosRoutes.js';
import adminAssinantesRoutes from './src/routes/adminAssinantesRoutes.js';
import adminInteressadosRoutes from './src/routes/adminInteressadosRoutes.js';
import assinaturaRoutes from './src/routes/assinaturaRoutes.js';
import pagamentoRoutes from './src/routes/pagamentoRoutes.js';

import bolinhasSangriaRoutes from './src/routes/bolinhasRoutes.js';
import consignadosRoutes from './src/routes/consignadosRoutes.js';
import receitaBolinhaRoutes from './src/routes/receitaBolinhaRoutes.js';
import receitaConsignadosRoutes from './src/routes/receitaConsignadosRoutes.js';
import peluciasRoutes from './src/routes/peluciasRoutes.js';
import receitaPeluciaRoutes from './src/routes/receitaPeluciaRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const viewsDir = path.join(__dirname, 'src/views');
const assetVersion =
  process.env.ASSET_VERSION ||
  String(Date.now());

const assetVersionCache = new Map();

const getAssetPath = (assetPath) => {
  if (!assetPath || !String(assetPath).startsWith('/')) {
    return assetPath;
  }

  if (String(assetPath).startsWith('/vendor/')) {
    return assetPath;
  }

  const [pathname] = String(assetPath).split('?');

  if (assetVersionCache.has(pathname)) {
    return `${pathname}?v=${assetVersionCache.get(pathname)}`;
  }

  try {
    const filePath = path.join(__dirname, 'public', pathname);
    const version = String(Math.floor(statSync(filePath).mtimeMs));
    assetVersionCache.set(pathname, version);
    return `${pathname}?v=${version}`;
  } catch (error) {
    return `${pathname}?v=${assetVersion}`;
  }
};

app.set('views', viewsDir);
app.set('view engine', 'ejs');

app.use(securityHeaders);
app.use(
  compression({
    level: 6,
    threshold: 1024
  })
);

/*
  Sitemap dinâmico.
  Precisa ficar antes do express.static para garantir que /sitemap.xml
  seja gerado pela rota dinâmica e não pelo arquivo public/sitemap.xml.
*/
app.use(sitemapRoutes);

app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    maxAge: '1h'
  })
);

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(legacyAssetRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(attachAuthenticatedUser);
app.use(attachCsrfToken);
app.use(requireCsrfProtection);
app.use(disableAuthenticatedCache);
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  res.locals.assetVersion = assetVersion;
  res.locals.assetPath = getAssetPath;

  res.locals.navigationProducts = res.locals.navigationProducts || {
    bolinhas: false,
    consignados: false,
    figurinhas: false,
    pelucias: false,
    hasAny: false
  };

  res.locals.assinaturaSomenteLeitura =
    res.locals.assinaturaSomenteLeitura || false;

  res.locals.financialNotifications = res.locals.financialNotifications || {
    total: 0,
    items: []
  };

  res.locals.operationalNotifications = res.locals.operationalNotifications || {
    total: 0,
    items: []
  };

  next();
});

app.use(
  '/vendor/sweetalert2',
  express.static(path.join(__dirname, 'node_modules', 'sweetalert2', 'dist'))
);

app.use(
  '/vendor/bootstrap',
  express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist'), {
    etag: true,
    maxAge: '30d',
    immutable: true
  })
);

app.use(
  '/vendor/bootstrap-icons',
  express.static(
    path.join(__dirname, 'node_modules', 'bootstrap-icons', 'font')
  )
);

app.use(
  '/vendor/inputmask',
  express.static(path.join(__dirname, 'node_modules', 'inputmask', 'dist'))
);

app.use(
  '/vendor/jspdf',
  express.static(path.join(__dirname, 'node_modules', 'jspdf', 'dist'))
);

app.use(
  '/vendor/jspdf-autotable',
  express.static(
    path.join(__dirname, 'node_modules', 'jspdf-autotable', 'dist')
  )
);

app.use(
  '/vendor/fontsource/urbanist',
  express.static(
    path.join(__dirname, 'node_modules', '@fontsource', 'urbanist')
  )
);

app.use(loginLogoutRoutes);
app.use(homepageRoutes);
app.use(blogRoutes);
app.use(interessadosRoutes);

const requireAuthenticatedSubscription = [
  isAuthenticated,
  attachSubscriptionStatus,
  requireReadableSubscription,
  attachNavigationContext
];

app.use('/search', requireAuthenticatedSubscription, searchRoutes);

app.use(
  '/estabelecimentos',
  requireAuthenticatedSubscription,
  estabelecimentoRoutes
);

app.use('/lancamentos', requireAuthenticatedSubscription, lancamentoRoutes);
app.use('/painel', requireAuthenticatedSubscription, painelRoutes);

app.use(
  '/fluxo-de-caixa',
  requireAuthenticatedSubscription,
  fluxoDeCaixaRoutes
);

app.use('/rotas', requireAuthenticatedSubscription, rotasRoutes);
app.use('/relatorios', requireAuthenticatedSubscription, relatoriosRoutes);
app.use('/assinatura', requireAuthenticatedSubscription, assinaturaRoutes);
app.use('/pagamentos', requireAuthenticatedSubscription, pagamentoRoutes);

app.use('/figurinhas', (req, res) => {
  const legacyBase = '/figurinhas';
  const suffix = req.originalUrl.startsWith(legacyBase)
    ? req.originalUrl.slice(legacyBase.length)
    : '';

  return res.redirect(301, `/consignados${suffix}`);
});

app.use(
  '/admin/assinantes',
  requireAuthenticatedSubscription,
  adminAssinantesRoutes
);

app.use(
  '/admin/interessados',
  requireAuthenticatedSubscription,
  adminInteressadosRoutes
);

app.use(
  '/bolinhas',
  requireAuthenticatedSubscription,
  requireProductAvailable('bolinhas'),
  receitaBolinhaRoutes
);

app.use(
  '/consignados',
  requireAuthenticatedSubscription,
  requireProductAvailable('consignados'),
  receitaConsignadosRoutes
);

app.use(
  '/bolinhas/sangrias',
  requireAuthenticatedSubscription,
  requireProductAvailable('bolinhas'),
  bolinhasSangriaRoutes
);

app.use(
  '/consignados/sangrias',
  requireAuthenticatedSubscription,
  requireProductAvailable('consignados'),
  consignadosRoutes
);

app.use(
  '/pelucias',
  requireAuthenticatedSubscription,
  requireProductAvailable('pelucias'),
  receitaPeluciaRoutes
);

app.use(
  '/pelucias',
  requireAuthenticatedSubscription,
  requireProductAvailable('pelucias'),
  peluciasRoutes
);

app.use((req, res, next) => {
  res.status(404).render('pages/404');
  console.log('Página 404 renderizada');
});

export default app;
