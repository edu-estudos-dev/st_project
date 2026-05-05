import blogModel from '../models/blogModel.js';

const SITE_URL = 'https://vendmaster.com.br';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/brand/logo.webp`;

function formatarDataPost(data) {
  if (!data) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(data));
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

function montarUrlImagem(caminhoImagem) {
  if (!caminhoImagem) return DEFAULT_OG_IMAGE;

  const imagem = String(caminhoImagem);

  if (imagem.startsWith('http://') || imagem.startsWith('https://')) {
    return imagem;
  }

  return `${SITE_URL}${imagem}`;
}

function formatarDataJsonLd(data) {
  if (!data) return undefined;

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return undefined;
  }

  return dataConvertida.toISOString();
}

function montarBreadcrumbJsonLd(itens) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function montarBlogCollectionJsonLd({
  name,
  description,
  url,
  posts = []
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'VendMaster',
      url: SITE_URL
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/blog/${post.slug}`,
        name: post.titulo
      }))
    }
  };
}

const blogController = {
  async index(req, res, next) {
    try {
      const [posts, categorias] = await Promise.all([
        blogModel.buscarPostsPublicados(),
        blogModel.buscarCategoriasPublicadas()
      ]);

      const canonicalUrl = `${SITE_URL}/blog`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Blog',
          url: canonicalUrl
        }
      ]);

      const collectionJsonLd = montarBlogCollectionJsonLd({
        name: 'Blog VendMaster',
        description:
          'Conteúdos sobre gestão de máquinas recreativas, sangrias, rotas, estoque, financeiro e operação.',
        url: canonicalUrl,
        posts
      });

      return res.render('pages/blog/index', {
        title: 'Blog VendMaster | Gestão para máquinas recreativas',
        metaDescription:
          'Conteúdos sobre gestão de máquinas recreativas, sangrias, rotas, estoque, financeiro e operação.',
        canonicalUrl,
        breadcrumbJsonLd,
        collectionJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/blog.css'
        ],
        posts,
        categorias,
        formatarDataPost,
        normalizarCategoriaParaUrl
      });
    } catch (error) {
      return next(error);
    }
  },

  async categoria(req, res, next) {
    try {
      const { categoria } = req.params;

      const [posts, categorias] = await Promise.all([
        blogModel.buscarPostsPorCategoria(categoria),
        blogModel.buscarCategoriasPublicadas()
      ]);

      const categoriaFormatada =
        posts[0]?.categoria ||
        categoria
          .split('-')
          .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
          .join(' ');

      const canonicalUrl = `${SITE_URL}/blog/categoria/${categoria}`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Blog',
          url: `${SITE_URL}/blog`
        },
        {
          name: categoriaFormatada,
          url: canonicalUrl
        }
      ]);

      const collectionJsonLd = montarBlogCollectionJsonLd({
        name: `Artigos sobre ${categoriaFormatada}`,
        description: `Veja artigos sobre ${categoriaFormatada} para melhorar a gestão da sua operação com máquinas recreativas, sangrias, rotas e estoque.`,
        url: canonicalUrl,
        posts
      });

      return res.render('pages/blog/categoria', {
        title: `Artigos sobre ${categoriaFormatada} | Blog VendMaster`,
        metaDescription: `Veja artigos sobre ${categoriaFormatada} para melhorar a gestão da sua operação com máquinas recreativas, sangrias, rotas e estoque.`,
        canonicalUrl,
        breadcrumbJsonLd,
        collectionJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/blog.css'
        ],
        categoria: categoriaFormatada,
        posts,
        categorias,
        formatarDataPost,
        normalizarCategoriaParaUrl
      });
    } catch (error) {
      return next(error);
    }
  },

  async artigo(req, res, next) {
    try {
      const { slug } = req.params;

      const post = await blogModel.buscarPostPorSlug(slug);

      if (!post) {
        return res.status(404).render('pages/404', {
          title: 'Artigo não encontrado | VendMaster',
          metaDescription:
            'O artigo que você tentou acessar não foi encontrado.',
          canonicalUrl: `${SITE_URL}/blog`,
          extraStyles: [
            '/css/blog-public-header.css',
            '/css/blog.css'
          ]
        });
      }

      const [postsRelacionados, categorias] = await Promise.all([
        blogModel.buscarPostsRelacionados({
          categoria: post.categoria,
          slugAtual: post.slug,
          limite: 3
        }),
        blogModel.buscarCategoriasPublicadas()
      ]);

      const title = post.meta_title || `${post.titulo} | VendMaster`;

      const metaDescription =
        post.meta_description ||
        post.resumo ||
        'Conteúdo do blog VendMaster sobre gestão de máquinas recreativas, sangrias, rotas, estoque e financeiro.';

      const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;

      const ogImage = montarUrlImagem(post.imagem_capa);

      const preloadImage = post.imagem_capa || null;

      const dataPublished =
        formatarDataJsonLd(post.data_publicacao) ||
        formatarDataJsonLd(post.data_criacao);

      const dataModified =
        formatarDataJsonLd(post.data_atualizacao) ||
        formatarDataJsonLd(post.data_publicacao) ||
        formatarDataJsonLd(post.data_criacao);

      const categoriaUrl = `${SITE_URL}/blog/categoria/${normalizarCategoriaParaUrl(post.categoria)}`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Blog',
          url: `${SITE_URL}/blog`
        },
        {
          name: post.categoria || 'Artigo',
          url: categoriaUrl
        },
        {
          name: post.titulo,
          url: canonicalUrl
        }
      ]);

      const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.titulo,
        description: metaDescription,
        image: ogImage,
        author: {
          '@type': 'Organization',
          name: post.autor || 'VendMaster'
        },
        publisher: {
          '@type': 'Organization',
          name: 'VendMaster',
          logo: {
            '@type': 'ImageObject',
            url: DEFAULT_OG_IMAGE
          }
        },
        datePublished: dataPublished,
        dateModified: dataModified,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl
        }
      };

      return res.render('pages/blog/artigo', {
        title,
        metaDescription,
        canonicalUrl,
        ogImage,
        preloadImage,
        articleJsonLd,
        breadcrumbJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/blog.css'
        ],
        post,
        postsRelacionados,
        categorias,
        formatarDataPost,
        normalizarCategoriaParaUrl
      });
    } catch (error) {
      return next(error);
    }
  }
};

export default blogController;