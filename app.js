import express from 'express';
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

import loginLogoutRoutes from './src/routes/loginLogoutRoutes.js';
import homepageRoutes from './src/routes/homepageRoutes.js';
import estabelecimentoRoutes from './src/routes/estabelecimentoRoutes.js';
import lancamentoRoutes from './src/routes/lancamentoRoutes.js';
import searchRoutes from './src/routes/searchRoutes.js';
import painelRoutes from './src/routes/painelRoutes.js';
import interessadosRoutes from './src/routes/interessadosRoutes.js';
import fluxoDeCaixaRoutes from './src/routes/fluxoDeCaixaRoutes.js';

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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(attachAuthenticatedUser);
app.use(attachCsrfToken);
app.use(requireCsrfProtection);
app.use(attachNavigationContext);
app.use(disableAuthenticatedCache);
app.use(methodOverride('_method'));
app.use('/vendor/sweetalert2', express.static(path.join(__dirname, 'node_modules', 'sweetalert2', 'dist')));
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false
}));

app.use(loginLogoutRoutes);
app.use(homepageRoutes);
app.use(interessadosRoutes);
app.use('/search', isAuthenticated, searchRoutes);
app.use('/estabelecimentos', isAuthenticated, estabelecimentoRoutes);
app.use('/lancamentos', isAuthenticated, lancamentoRoutes);
app.use('/painel', isAuthenticated, painelRoutes);
app.use('/fluxo-de-caixa', isAuthenticated, fluxoDeCaixaRoutes);
app.use('/bolinhas', isAuthenticated, requireProductAvailable('bolinhas'), receitaBolinhaRoutes);
app.use('/figurinhas', isAuthenticated, requireProductAvailable('figurinhas'), receitaFigurinhaRoutes);
app.use('/bolinhas/sangrias', isAuthenticated, requireProductAvailable('bolinhas'), bolinhasSangriaRoutes);
app.use('/figurinhas/sangrias', isAuthenticated, requireProductAvailable('figurinhas'), figurinhasRoutes); 

app.use('/pelucias', isAuthenticated, requireProductAvailable('pelucias'), receitaPeluciaRoutes);
app.use('/pelucias', isAuthenticated, requireProductAvailable('pelucias'), peluciasRoutes);

app.use((req, res, next) => {
    res.status(404).render('pages/404');
    console.log("Página 404 renderizada");
});

export default app;
