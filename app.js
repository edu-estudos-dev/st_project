import express from 'express';
import compression from 'compression';
import path from 'path';
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
import estabelecimentoRoutes from './src/routes/estabelecimentoRoutes.js';
import lancamentoRoutes from './src/routes/lancamentoRoutes.js';
import searchRoutes from './src/routes/searchRoutes.js';
import painelRoutes from './src/routes/painelRoutes.js';
import interessadosRoutes from './src/routes/interessadosRoutes.js';
import fluxoDeCaixaRoutes from './src/routes/fluxoDeCaixaRoutes.js';
import rotasRoutes from './src/routes/rotasRoutes.js';
import relatoriosRoutes from './src/routes/relatoriosRoutes.js';
import adminAssinantesRoutes from './src/routes/adminAssinantesRoutes.js';
import assinaturaRoutes from './src/routes/assinaturaRoutes.js';

import bolinhasSangriaRoutes from './src/routes/bolinhasRoutes.js';
import figurinhasRoutes from './src/routes/figurinhasRoutes.js';
import receitaBolinhaRoutes from './src/routes/receitaBolinhaRoutes.js';
import receitaFigurinhaRoutes from './src/routes/receitaFigurinhaRoutes.js';
import peluciasRoutes from './src/routes/peluciasRoutes.js';
import receitaPeluciaRoutes from './src/routes/receitaPeluciaRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

const viewsDir = path.join(__dirname, 'src/views');
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
    etag: false
  })
);

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const legacyImageRedirects = {
  '/apple-touch-icon.png': '/images/system/apple-touch-icon.png',
  '/favicon-96x96.png': '/images/system/favicon-96x96.png',
  '/images/antonio-ferreira.webp': '/images/home/antonio-ferreira.webp',
  '/images/bolinhas.webp': '/images/home/bolinhas.webp',
  '/images/capa-rota-maquinas-recreativas.webp': '/images/blog/capa-rota-maquinas-recreativas.webp',
  '/images/consignados.webp': '/images/home/consignados.webp',
  '/images/dashboard-vendmaster-mobile.webp': '/images/home/dashboard-vendmaster-mobile.webp',
  '/images/dashboard-vendmaster.webp': '/images/home/dashboard-vendmaster.webp',
  '/images/eduardo-praciano.webp': '/images/home/eduardo-praciano.webp',
  '/images/garantia-30-dias-vendmaster.webp': '/images/home/garantia-30-dias-vendmaster.webp',
  '/images/gfgfgfg.webp': '/images/system/gfgfgfg.webp',
  '/images/ggfgfgfg.webp': '/images/system/ggfgfgfg.webp',
  '/images/joao-ribeiro.webp': '/images/home/joao-ribeiro.webp',
  '/images/logo-320.webp': '/images/brand/logo-320.webp',
  '/images/logo.webp': '/images/brand/logo.webp',
  '/images/marcelo-costa.webp': '/images/home/marcelo-costa.webp',
  '/images/og-image.png': '/images/brand/og-image.png',
  '/images/painel-vendmaster.webp': '/images/home/painel-vendmaster.webp',
  '/images/pelucias.webp': '/images/home/pelucias.webp',
  '/images/rota-vendmaster-mobile.webp': '/images/home/rota-vendmaster-mobile.webp',
  '/images/rota-vendmaster.webp': '/images/home/rota-vendmaster.webp',
  '/web-app-manifest-192x192.png': '/images/system/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png': '/images/system/web-app-manifest-512x512.png'
};

Object.entries(legacyImageRedirects).forEach(([from, to]) => {
  app.get(from, (req, res) => {
    res.redirect(301, to);
  });
});

app.get('/favicon.ico', (req, res) => {
  res.redirect(301, '/images/system/favicon.svg');
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(attachAuthenticatedUser);
app.use(attachCsrfToken);
app.use(requireCsrfProtection);
app.use(disableAuthenticatedCache);
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  res.locals.navigationProducts = res.locals.navigationProducts || {
    bolinhas: false,
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
  express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist'))
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

app.use(
  '/admin/assinantes',
  requireAuthenticatedSubscription,
  adminAssinantesRoutes
);

app.use(
  '/bolinhas',
  requireAuthenticatedSubscription,
  requireProductAvailable('bolinhas'),
  receitaBolinhaRoutes
);

app.use(
  '/figurinhas',
  requireAuthenticatedSubscription,
  requireProductAvailable('figurinhas'),
  receitaFigurinhaRoutes
);

app.use(
  '/bolinhas/sangrias',
  requireAuthenticatedSubscription,
  requireProductAvailable('bolinhas'),
  bolinhasSangriaRoutes
);

app.use(
  '/figurinhas/sangrias',
  requireAuthenticatedSubscription,
  requireProductAvailable('figurinhas'),
  figurinhasRoutes
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
