import express from 'express';
import blogModel from '../models/blogModel.js';

const router = express.Router();

const SITE_URL = 'https://vendmaster.com.br';

function formatarDataSitemap(data) {
  if (!data) return null;

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return null;
  }

  return dataObj.toISOString().split('T')[0];
}

function escaparXml(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizarCategoriaParaUrl(categoria) {
  return String(categoria || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function criarUrlSitemap({ loc, lastmod, changefreq, priority }) {
  const linhas = [
    '  <url>',
    `    <loc>${escaparXml(loc)}</loc>`
  ];

  if (lastmod) {
    linhas.push(`    <lastmod>${escaparXml(lastmod)}</lastmod>`);
  }

  if (changefreq) {
    linhas.push(`    <changefreq>${escaparXml(changefreq)}</changefreq>`);
  }

  if (priority) {
    linhas.push(`    <priority>${escaparXml(priority)}</priority>`);
  }

  linhas.push('  </url>');

  return linhas.join('\n');
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    const [posts, categorias] = await Promise.all([
      blogModel.buscarPostsPublicados(),
      blogModel.buscarCategoriasPublicadas()
    ]);

    const urlsFixas = [
      {
        loc: `${SITE_URL}/`,
        changefreq: 'weekly',
        priority: '1.0'
      },
      {
        loc: `${SITE_URL}/blog`,
        changefreq: 'weekly',
        priority: '0.8'
      }
    ];

    const urlsCategorias = categorias
      .filter((item) => item?.categoria)
      .map((item) => ({
        loc: `${SITE_URL}/blog/categoria/${normalizarCategoriaParaUrl(item.categoria)}`,
        changefreq: 'weekly',
        priority: '0.7'
      }));

    const urlsArtigos = posts.map((post) => ({
      loc: `${SITE_URL}/blog/${post.slug}`,
      lastmod: formatarDataSitemap(
        post.data_atualizacao || post.data_publicacao || post.data_criacao
      ),
      changefreq: 'monthly',
      priority: '0.9'
    }));

    const urls = [
      ...urlsFixas,
      ...urlsCategorias,
      ...urlsArtigos
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(criarUrlSitemap).join('\n\n')}
</urlset>`;

    res.type('application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('Erro ao gerar sitemap.xml:', error);

    return res.status(500).type('text/plain').send('Erro ao gerar sitemap.xml');
  }
});

export default router;