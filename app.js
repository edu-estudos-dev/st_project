  import express from 'express';
  import compression from 'compression';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import cookieParser from 'cookie-parser';
  import methodOverride from 'method-override';
  import dotenv from 'dotenv';
  import isAuthenticated, { attachAuthenticatedUser } from './src/middleware/isAuthenticated.js';
  import { attachCsrfToken, requireCsrfProtection } from './src/middleware/csrfMiddleware.js';
  import { attachNavigationContext } from './src/middleware/navigationContext.js';
  import { requireProductAvailable } from './src/middleware/productAvailability.js';
  import { disableAuthenticatedCache, securityHeaders } from './src/middleware/securityMiddleware.js';
  import { attachSubscriptionStatus, requireReadableSubscription } from './src/middleware/subscriptionStatus.js';

  import loginLogoutRoutes from './src/routes/loginLogoutRoutes.js';
  import homepageRoutes from './src/routes/homepageRoutes.js';
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
  app.use(compression({
      level: 6,
      threshold: 1024
  }));

  app.use(express.static(path.join(__dirname, 'public'), {
      etag: false
  }));
  app.get('/healthz', (req, res) => {
      res.status(200).json({ status: 'ok' });
  });
  app.get('/sitemap.xml', (req, res) => {
      res.type('application/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vendmaster.com.br/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });
  app.get('/favicon.ico', (req, res) => {
      res.redirect(301, '/favicon.svg');
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(attachAuthenticatedUser);
  app.use(attachCsrfToken);
  app.use(requireCsrfProtection);
  app.use(disableAuthenticatedCache);
  app.use(methodOverride('_method'));
  app.use('/vendor/sweetalert2', express.static(path.join(__dirname, 'node_modules', 'sweetalert2', 'dist')));
  app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
  app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules', 'bootstrap-icons', 'font')));
  app.use('/vendor/inputmask', express.static(path.join(__dirname, 'node_modules', 'inputmask', 'dist')));
  app.use('/vendor/jspdf', express.static(path.join(__dirname, 'node_modules', 'jspdf', 'dist')));
  app.use('/vendor/jspdf-autotable', express.static(path.join(__dirname, 'node_modules', 'jspdf-autotable', 'dist')));
  app.use('/vendor/fontsource/urbanist', express.static(path.join(__dirname, 'node_modules', '@fontsource', 'urbanist')));


  app.use(loginLogoutRoutes);
  app.use(homepageRoutes);
  app.use(interessadosRoutes);
  const requireAuthenticatedSubscription = [
      isAuthenticated,
      attachSubscriptionStatus,
      requireReadableSubscription,
      attachNavigationContext
  ];

  app.use('/search', requireAuthenticatedSubscription, searchRoutes);
  app.use('/estabelecimentos', requireAuthenticatedSubscription, estabelecimentoRoutes);
  app.use('/lancamentos', requireAuthenticatedSubscription, lancamentoRoutes);
  app.use('/painel', requireAuthenticatedSubscription, painelRoutes);
  app.use('/fluxo-de-caixa', requireAuthenticatedSubscription, fluxoDeCaixaRoutes);
  app.use('/rotas', requireAuthenticatedSubscription, rotasRoutes);
  app.use('/relatorios', requireAuthenticatedSubscription, relatoriosRoutes);
  app.use('/assinatura', requireAuthenticatedSubscription, assinaturaRoutes);
  app.use('/admin/assinantes', requireAuthenticatedSubscription, adminAssinantesRoutes);
  app.use('/bolinhas', requireAuthenticatedSubscription, requireProductAvailable('bolinhas'), receitaBolinhaRoutes);
  app.use('/figurinhas', requireAuthenticatedSubscription, requireProductAvailable('figurinhas'), receitaFigurinhaRoutes);
  app.use('/bolinhas/sangrias', requireAuthenticatedSubscription, requireProductAvailable('bolinhas'), bolinhasSangriaRoutes);
  app.use('/figurinhas/sangrias', requireAuthenticatedSubscription, requireProductAvailable('figurinhas'), figurinhasRoutes);

  app.use('/pelucias', requireAuthenticatedSubscription, requireProductAvailable('pelucias'), receitaPeluciaRoutes);
  app.use('/pelucias', requireAuthenticatedSubscription, requireProductAvailable('pelucias'), peluciasRoutes);

  app.use((req, res, next) => {
      res.status(404).render('pages/404');
      console.log("Página 404 renderizada");
  });

  export default app;
