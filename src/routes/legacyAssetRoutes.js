import express from 'express';

const router = express.Router();

const legacyAssetRedirects = {
  '/apple-touch-icon.png': '/images/system/apple-touch-icon.png',
  '/favicon-96x96.png': '/images/system/favicon-96x96.png',
  '/favicon.ico': '/images/system/favicon.ico',
  '/images/antonio-ferreira.webp': '/images/home/antonio-ferreira.webp',
  '/images/bolinhas.webp': '/images/home/bolinhas.webp',
  '/images/capa-rota-maquinas-recreativas.webp':
    '/images/blog/capa-rota-maquinas-recreativas.webp',
  '/images/consignados.webp': '/images/home/consignados.webp',
  '/images/dashboard-vendmaster-mobile.webp':
    '/images/home/dashboard-vendmaster-mobile.webp',
  '/images/dashboard-vendmaster.webp': '/images/home/dashboard-vendmaster.webp',
  '/images/eduardo-praciano.webp': '/images/home/eduardo-praciano.webp',
  '/images/garantia-30-dias-vendmaster.webp':
    '/images/home/garantia-30-dias-vendmaster.webp',
  '/images/joao-ribeiro.webp': '/images/home/joao-ribeiro.webp',
  '/images/logo-320.webp': '/images/brand/logo-320.webp',
  '/images/logo.webp': '/images/brand/logo.webp',
  '/images/marcelo-costa.webp': '/images/home/marcelo-costa.webp',
  '/images/og-image.png': '/images/brand/og-image.png',
  '/images/painel-vendmaster.webp': '/images/home/painel-vendmaster.webp',
  '/images/pelucias.webp': '/images/home/pelucias.webp',
  '/images/rota-vendmaster-mobile.webp':
    '/images/home/rota-vendmaster-mobile.webp',
  '/images/rota-vendmaster.webp': '/images/home/rota-vendmaster.webp',
  '/web-app-manifest-192x192.png':
    '/images/system/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png': '/images/system/web-app-manifest-512x512.png'
};

Object.entries(legacyAssetRedirects).forEach(([from, to]) => {
  router.get(from, (req, res) => {
    res.redirect(301, to);
  });
});

export default router;
