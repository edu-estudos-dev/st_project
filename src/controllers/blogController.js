import blogModel from '../models/blogModel.js';

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

const blogController = {
  async index(req, res, next) {
    try {
      const [posts, categorias] = await Promise.all([
        blogModel.buscarPostsPublicados(),
        blogModel.buscarCategoriasPublicadas()
      ]);

      return res.render('pages/blog/index', {
        title: 'Blog VendMaster | Gestão para máquinas recreativas',
        metaDescription:
          'Conteúdos sobre gestão de máquinas recreativas, sangrias, rotas, estoque, financeiro e operação.',
        canonicalUrl: 'https://vendmaster.com.br/blog',
        extraStyles: ['/css/blog.css'],
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
          .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
          .join(' ');

      return res.render('pages/blog/categoria', {
        title: `Artigos sobre ${categoriaFormatada} | Blog VendMaster`,
        metaDescription: `Veja artigos sobre ${categoriaFormatada} para melhorar a gestão da sua operação com máquinas recreativas, sangrias, rotas e estoque.`,
        canonicalUrl: `https://vendmaster.com.br/blog/categoria/${categoria}`,
        extraStyles: ['/css/blog.css'],
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
          metaDescription: 'O artigo que você tentou acessar não foi encontrado.',
          canonicalUrl: 'https://vendmaster.com.br/blog',
          extraStyles: ['/css/blog.css']
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

      const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.titulo,
        description: post.meta_description || post.resumo,
        image: post.imagem_capa
          ? `https://vendmaster.com.br${post.imagem_capa}`
          : 'https://vendmaster.com.br/images/logo.webp',
        author: {
          '@type': 'Organization',
          name: post.autor || 'VendMaster'
        },
        publisher: {
          '@type': 'Organization',
          name: 'VendMaster',
          logo: {
            '@type': 'ImageObject',
            url: 'https://vendmaster.com.br/images/logo.webp'
          }
        },
        datePublished: post.data_publicacao || post.data_criacao,
        dateModified: post.data_atualizacao || post.data_publicacao || post.data_criacao,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://vendmaster.com.br/blog/${post.slug}`
        }
      };

      return res.render('pages/blog/artigo', {
        title: post.meta_title || `${post.titulo} | VendMaster`,
        metaDescription: post.meta_description || post.resumo,
        canonicalUrl: `https://vendmaster.com.br/blog/${post.slug}`,
        ogImage: post.imagem_capa
          ? `https://vendmaster.com.br${post.imagem_capa}`
          : 'https://vendmaster.com.br/images/logo.webp',
        articleJsonLd,
        extraStyles: ['/css/blog.css'],
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