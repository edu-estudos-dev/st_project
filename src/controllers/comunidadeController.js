import forumCategoryModel from '../models/forumCategoryModel.js';
import forumTopicModel from '../models/forumTopicModel.js';
import forumReplyModel from '../models/forumReplyModel.js';
import forumSlugService from '../services/forumSlugService.js';
import forumPermissionService from '../services/forumPermissionService.js';
import { isSaasAdminUser } from '../utilities/saasAdmin.js';

const SITE_URL = 'https://vendmaster.com.br';

const MIN_TITLE_LENGTH = 8;
const MAX_TITLE_LENGTH = 140;
const MIN_TOPIC_CONTENT_LENGTH = 20;
const MAX_TOPIC_CONTENT_LENGTH = 10000;
const MIN_REPLY_LENGTH = 5;
const MAX_REPLY_LENGTH = 8000;

const TERMOS_PRESERVADOS = new Map([
  ['pix', 'PIX'],
  ['cpf', 'CPF'],
  ['cnpj', 'CNPJ'],
  ['api', 'API'],
  ['url', 'URL'],
  ['seo', 'SEO'],
  ['lgpd', 'LGPD'],
  ['asaas', 'Asaas'],
  ['vendmaster', 'VendMaster']
]);

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

function formatarDataForum(data) {
  if (!data) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(data));
}

function resumirTexto(texto, limite = 155) {
  const limpo = String(texto || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (limpo.length <= limite) {
    return limpo;
  }

  return `${limpo.slice(0, limite - 3).trim()}...`;
}

function normalizarTexto(texto) {
  return String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function preservarTermosImportantes(texto) {
  return String(texto || '').replace(/\b[\p{L}\p{N}]+\b/gu, (termo) => {
    const termoNormalizado = termo.toLocaleLowerCase('pt-BR');
    return TERMOS_PRESERVADOS.get(termoNormalizado) || termo;
  });
}

function capitalizarPrimeiraLetra(texto) {
  const caracteres = Array.from(texto || '');
  const indice = caracteres.findIndex((char) => /\p{L}/u.test(char));

  if (indice === -1) {
    return texto;
  }

  caracteres[indice] = caracteres[indice].toLocaleUpperCase('pt-BR');

  return caracteres.join('');
}

function normalizarComoFrase(texto) {
  const textoMinusculo = String(texto || '').toLocaleLowerCase('pt-BR');
  const fraseCapitalizada = capitalizarPrimeiraLetra(textoMinusculo);

  return preservarTermosImportantes(fraseCapitalizada);
}

function palavraTemCaixaAlternada(palavra) {
  const letras = Array.from(String(palavra || '')).filter((char) => /\p{L}/u.test(char));

  if (letras.length < 4) {
    return false;
  }

  const maiusculas = letras.filter((char) => char === char.toLocaleUpperCase('pt-BR')).length;
  const minusculas = letras.filter((char) => char === char.toLocaleLowerCase('pt-BR')).length;

  if (maiusculas < 2 || minusculas < 2) {
    return false;
  }

  let alternancias = 0;

  for (let index = 1; index < letras.length; index += 1) {
    const anteriorMaiusculo =
      letras[index - 1] === letras[index - 1].toLocaleUpperCase('pt-BR');
    const atualMaiusculo =
      letras[index] === letras[index].toLocaleUpperCase('pt-BR');

    if (anteriorMaiusculo !== atualMaiusculo) {
      alternancias += 1;
    }
  }

  return alternancias >= Math.floor(letras.length / 2);
}

function textoTemCaixaAlternada(texto) {
  return String(texto || '')
    .split(/\s+/)
    .some((palavra) => palavraTemCaixaAlternada(palavra));
}

function normalizarTituloForum(titulo) {
  const limpo = normalizarTexto(titulo).replace(/[ \t]{2,}/g, ' ');

  const letras = Array.from(limpo).filter((char) => /\p{L}/u.test(char));

  if (letras.length < 2) {
    return limpo;
  }

  const todoMaiusculo =
    limpo === limpo.toLocaleUpperCase('pt-BR') &&
    limpo !== limpo.toLocaleLowerCase('pt-BR');

  const todoMinusculo =
    limpo === limpo.toLocaleLowerCase('pt-BR') &&
    limpo !== limpo.toLocaleUpperCase('pt-BR');

  if (todoMaiusculo || todoMinusculo || textoTemCaixaAlternada(limpo)) {
    return normalizarComoFrase(limpo);
  }

  return preservarTermosImportantes(limpo);
}

function normalizarConteudoForum(conteudo) {
  return String(conteudo || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map((linha) => linha.replace(/[ ]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validarTopico({ titulo, conteudo, categoryId }) {
  const erros = [];

  if (!categoryId) {
    erros.push('Escolha uma categoria para o tópico.');
  }

  if (titulo.length < MIN_TITLE_LENGTH) {
    erros.push(`O título precisa ter pelo menos ${MIN_TITLE_LENGTH} caracteres.`);
  }

  if (titulo.length > MAX_TITLE_LENGTH) {
    erros.push(`O título pode ter no máximo ${MAX_TITLE_LENGTH} caracteres.`);
  }

  if (conteudo.length < MIN_TOPIC_CONTENT_LENGTH) {
    erros.push(`O conteúdo precisa ter pelo menos ${MIN_TOPIC_CONTENT_LENGTH} caracteres.`);
  }

  if (conteudo.length > MAX_TOPIC_CONTENT_LENGTH) {
    erros.push(`O conteúdo pode ter no máximo ${MAX_TOPIC_CONTENT_LENGTH} caracteres.`);
  }

  return erros;
}

function validarResposta(conteudo) {
  const erros = [];

  if (conteudo.length < MIN_REPLY_LENGTH) {
    erros.push(`A resposta precisa ter pelo menos ${MIN_REPLY_LENGTH} caracteres.`);
  }

  if (conteudo.length > MAX_REPLY_LENGTH) {
    erros.push(`A resposta pode ter no máximo ${MAX_REPLY_LENGTH} caracteres.`);
  }

  return erros;
}

function getAssinanteId(req) {
  return req.user?.assinante_id || req.user?.assinatura?.id || null;
}

async function renderNovoTopico(req, res, {
  formData = {},
  errorMessage = null,
  successMessage = null
} = {}) {
  const categorias = await forumCategoryModel.listarAtivas();
  const blockedParticipationReason =
    forumPermissionService.getBlockedParticipationReason(req.user);

  const canonicalUrl = `${SITE_URL}/comunidade/novo`;

  const breadcrumbJsonLd = montarBreadcrumbJsonLd([
    {
      name: 'Início',
      url: `${SITE_URL}/`
    },
    {
      name: 'Comunidade',
      url: `${SITE_URL}/comunidade`
    },
    {
      name: 'Novo tópico',
      url: canonicalUrl
    }
  ]);

  return res.render('pages/comunidade/novo', {
    title: 'Criar tópico | Comunidade VendMaster',
    metaDescription:
      'Crie uma nova discussão na Comunidade VendMaster sobre operação de campo, rotas, sangrias, comissões, máquinas e uso do sistema.',
    canonicalUrl,
    robotsMeta: 'noindex, follow',
    breadcrumbJsonLd,
    extraStyles: [
      '/css/blog-public-header.css',
      '/css/comunidade.css'
    ],
    categorias,
    formData,
    query: req.query || {},
    errorMessage,
    successMessage,
    blockedParticipationReason,
    canCreateTopic: forumPermissionService.canCreateTopic(req.user)
  });
}

const ComunidadeController = {
  async index(req, res, next) {
    try {
      const [categorias, topicosRecentes] = await Promise.all([
        forumCategoryModel.listarAtivasComResumo(),
        forumTopicModel.listarRecentes({ limit: 12 })
      ]);

      const canonicalUrl = `${SITE_URL}/comunidade`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Comunidade',
          url: canonicalUrl
        }
      ]);

      return res.render('pages/comunidade/index', {
        title: 'Comunidade VendMaster | Operadores de máquinas recreativas',
        metaDescription:
          'Participe da Comunidade VendMaster: dúvidas, experiências e boas práticas para operadores de máquinas recreativas, bolinhas, pelúcias, gruas, consignados, rotas e sangrias.',
        canonicalUrl,
        breadcrumbJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/comunidade.css'
        ],
        categorias,
        topicosRecentes,
        formatarDataForum,
        canCreateTopic: forumPermissionService.canCreateTopic(req.user),
        blockedParticipationReason:
          forumPermissionService.getBlockedParticipationReason(req.user)
      });
    } catch (error) {
      return next(error);
    }
  },

  async categoria(req, res, next) {
    try {
      const { slug } = req.params;

      const categoria = await forumCategoryModel.buscarPorSlug(slug);

      if (!categoria) {
        return res.status(404).render('pages/404', {
          title: 'Categoria não encontrada | Comunidade VendMaster',
          metaDescription:
            'A categoria da Comunidade VendMaster que você tentou acessar não foi encontrada.',
          canonicalUrl: `${SITE_URL}/comunidade`,
          extraStyles: [
            '/css/blog-public-header.css',
            '/css/comunidade.css'
          ]
        });
      }

      const topicos = await forumTopicModel.listarPorCategoria({
        categoryId: categoria.id,
        limit: 40
      });

      const canonicalUrl = `${SITE_URL}/comunidade/categoria/${categoria.slug}`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Comunidade',
          url: `${SITE_URL}/comunidade`
        },
        {
          name: categoria.nome,
          url: canonicalUrl
        }
      ]);

      return res.render('pages/comunidade/categoria', {
        title: `${categoria.nome} | Comunidade VendMaster`,
        metaDescription:
          categoria.descricao ||
          `Discussões da Comunidade VendMaster sobre ${categoria.nome}.`,
        canonicalUrl,
        breadcrumbJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/comunidade.css'
        ],
        categoria,
        topicos,
        formatarDataForum,
        canCreateTopic: forumPermissionService.canCreateTopic(req.user),
        blockedParticipationReason:
          forumPermissionService.getBlockedParticipationReason(req.user)
      });
    } catch (error) {
      return next(error);
    }
  },

  async topico(req, res, next) {
    try {
      const { slug } = req.params;

      const topico = await forumTopicModel.buscarPorSlug(slug);

      if (!topico) {
        return res.status(404).render('pages/404', {
          title: 'Tópico não encontrado | Comunidade VendMaster',
          metaDescription:
            'O tópico da Comunidade VendMaster que você tentou acessar não foi encontrado.',
          canonicalUrl: `${SITE_URL}/comunidade`,
          extraStyles: [
            '/css/blog-public-header.css',
            '/css/comunidade.css'
          ]
        });
      }

      await forumTopicModel.incrementarVisualizacao(topico.id);

      const respostas = await forumReplyModel.listarPorTopico(topico.id);

      const canonicalUrl = `${SITE_URL}/comunidade/topico/${topico.slug}`;

      const breadcrumbJsonLd = montarBreadcrumbJsonLd([
        {
          name: 'Início',
          url: `${SITE_URL}/`
        },
        {
          name: 'Comunidade',
          url: `${SITE_URL}/comunidade`
        },
        {
          name: topico.categoria_nome,
          url: `${SITE_URL}/comunidade/categoria/${topico.categoria_slug}`
        },
        {
          name: topico.titulo,
          url: canonicalUrl
        }
      ]);

      const canReply =
        topico.status === 'open' && forumPermissionService.canReply(req.user);

      const canModerateForum = isSaasAdminUser(req.user);

      return res.render('pages/comunidade/topico', {
        title: `${topico.titulo} | Comunidade VendMaster`,
        metaDescription:
          resumirTexto(topico.conteudo) ||
          'Discussão da Comunidade VendMaster sobre operação, rotas, sangrias, comissões, máquinas e gestão.',
        canonicalUrl,
        breadcrumbJsonLd,
        extraStyles: [
          '/css/blog-public-header.css',
          '/css/comunidade.css'
        ],
        topico: {
          ...topico,
          view_count: Number(topico.view_count || 0) + 1
        },
        respostas,
        formData: {},
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null,
        formatarDataForum,
        canReply,
        canModerateForum,
        blockedParticipationReason:
          forumPermissionService.getBlockedParticipationReason(req.user)
      });
    } catch (error) {
      return next(error);
    }
  },

  async novo(req, res, next) {
    try {
      return renderNovoTopico(req, res);
    } catch (error) {
      return next(error);
    }
  },

  async criar(req, res, next) {
    try {
      if (!forumPermissionService.canCreateTopic(req.user)) {
        return renderNovoTopico(req, res, {
          formData: req.body,
          errorMessage:
            'Sua assinatura precisa estar ativa ou em período de teste para criar tópicos na comunidade.'
        });
      }

      const titulo = normalizarTituloForum(req.body.titulo);
      const conteudo = normalizarConteudoForum(req.body.conteudo);
      const categoryId = req.body.category_id;

      const erros = validarTopico({
        titulo,
        conteudo,
        categoryId
      });

      const categoria = categoryId
        ? await forumCategoryModel.buscarPorId(categoryId)
        : null;

      if (!categoria) {
        erros.push('A categoria selecionada não foi encontrada.');
      }

      if (erros.length > 0) {
        return renderNovoTopico(req, res, {
          formData: {
            ...req.body,
            titulo,
            conteudo
          },
          errorMessage: erros[0]
        });
      }

      const slug = await forumSlugService.gerarSlugUnico({
        titulo,
        existsBySlug: forumTopicModel.existsBySlug.bind(forumTopicModel)
      });

      const topico = await forumTopicModel.criar({
        categoryId: categoria.id,
        authorUserId: req.user.id,
        assinanteId: getAssinanteId(req),
        titulo,
        slug,
        conteudo
      });

      return res.redirect(`/comunidade/topico/${topico.slug}`);
    } catch (error) {
      return next(error);
    }
  },

  async responder(req, res, next) {
    try {
      const { slug } = req.params;
      const topico = await forumTopicModel.buscarPorSlug(slug);

      if (!topico) {
        return res.status(404).render('pages/404', {
          title: 'Tópico não encontrado | Comunidade VendMaster',
          metaDescription:
            'O tópico da Comunidade VendMaster que você tentou responder não foi encontrado.',
          canonicalUrl: `${SITE_URL}/comunidade`,
          extraStyles: [
            '/css/blog-public-header.css',
            '/css/comunidade.css'
          ]
        });
      }

      const conteudo = normalizarConteudoForum(req.body.conteudo);
      const respostas = await forumReplyModel.listarPorTopico(topico.id);
      const canonicalUrl = `${SITE_URL}/comunidade/topico/${topico.slug}`;

      const renderTopicoComErro = (errorMessage) => {
        const canReply =
          topico.status === 'open' && forumPermissionService.canReply(req.user);

        return res.status(400).render('pages/comunidade/topico', {
          title: `${topico.titulo} | Comunidade VendMaster`,
          metaDescription:
            resumirTexto(topico.conteudo) ||
            'Discussão da Comunidade VendMaster sobre operação, rotas, sangrias, comissões, máquinas e gestão.',
          canonicalUrl,
          breadcrumbJsonLd: montarBreadcrumbJsonLd([
            {
              name: 'Início',
              url: `${SITE_URL}/`
            },
            {
              name: 'Comunidade',
              url: `${SITE_URL}/comunidade`
            },
            {
              name: topico.categoria_nome,
              url: `${SITE_URL}/comunidade/categoria/${topico.categoria_slug}`
            },
            {
              name: topico.titulo,
              url: canonicalUrl
            }
          ]),
          extraStyles: [
            '/css/blog-public-header.css',
            '/css/comunidade.css'
          ],
          topico,
          respostas,
          formData: {
            conteudo
          },
          successMessage: null,
          errorMessage,
          formatarDataForum,
          canReply,
          canModerateForum: isSaasAdminUser(req.user),
          blockedParticipationReason:
            forumPermissionService.getBlockedParticipationReason(req.user)
        });
      };

      if (topico.status !== 'open') {
        return renderTopicoComErro(
          'Este tópico está fechado e não aceita novas respostas.'
        );
      }

      if (!forumPermissionService.canReply(req.user)) {
        return renderTopicoComErro(
          'Sua assinatura precisa estar ativa ou em período de teste para responder tópicos na comunidade.'
        );
      }

      const erros = validarResposta(conteudo);

      if (erros.length > 0) {
        return renderTopicoComErro(erros[0]);
      }

      await forumReplyModel.criar({
        topicId: topico.id,
        authorUserId: req.user.id,
        assinanteId: getAssinanteId(req),
        conteudo
      });

      return res.redirect(`/comunidade/topico/${topico.slug}#respostas`);
    } catch (error) {
      return next(error);
    }
  }
};

export default ComunidadeController;