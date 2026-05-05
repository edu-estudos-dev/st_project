import blogModel from '../models/blogModel.js';

const homepageFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Funciona no celular?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. A interface foi pensada para computador e celular, especialmente para consulta durante a rotina de campo.'
      }
    },
    {
      '@type': 'Question',
      name: 'Preciso instalar aplicativo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Não. O acesso é feito pelo navegador, com login e senha.'
      }
    },
    {
      '@type': 'Question',
      name: 'Serve para bolinhas, pelúcias e consignados?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. Cada frente pode ter controles próprios, mantendo uma visão geral da operação.'
      }
    },
    {
      '@type': 'Question',
      name: 'Consigo controlar comissão do parceiro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim. O objetivo é registrar vendido, reposto, comissão e valor líquido de forma clara para facilitar o acerto.'
      }
    },
    {
      '@type': 'Question',
      name: 'Quanto custa?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Os planos começam em R$ 19,90 por mês para uma ferramenta. Você pode escolher entre controle de máquinas de bolinhas, consignados e pelúcias. Com duas ferramentas, o plano fica R$ 24,90 por mês. Para usar as três, o plano completo fica R$ 29,90 por mês.'
      }
    },
    {
      '@type': 'Question',
      name: 'Em quanto tempo recebo retorno?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Respondemos em até 24h, preferencialmente pelo WhatsApp informado no formulário.'
      }
    }
  ]
};

class HomepageController {
  async renderHomepage(req, res, next) {
    try {
      console.log('Renderizando pagina inicial');

      const postsPublicados = await blogModel.buscarPostsPublicados();

      const postsRecentes = postsPublicados.slice(0, 2).map(post => ({
        titulo: post.titulo,
        slug: post.slug,
        categoria: post.categoria,
        resumo: post.resumo,
        imagem: post.imagem_capa || '/images/brand/logo.webp'
      }));

      return res.render('pages/homepage', {
        title:
          'Sistema de gestão para máquinas recreativas e consignados | VendMaster',
        metaDescription:
          'Sistema de gestão para máquinas recreativas, bolinhas, gruas e consignados. Organize pontos, sangrias, rotas, estoque, comissões e financeiro.',
        canonicalUrl: 'https://vendmaster.com.br/',
        faqJsonLd: homepageFaqJsonLd,
        postsRecentes,
        skipGlobalStyles: true,
        preloadExtraStyles: false
      });
    } catch (error) {
      return next(error);
    }
  }

  renderPricingPage(req, res) {
    const canonicalUrl = 'https://vendmaster.com.br/precos';

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: 'https://vendmaster.com.br/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Preços',
          item: canonicalUrl
        }
      ]
    };

    const offerCatalogJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'Planos VendMaster',
      url: canonicalUrl,
      itemListElement: [
        {
          '@type': 'Offer',
          name: 'Plano Essencial - 1 ferramenta',
          price: '19.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          description:
            'Plano para operadores que desejam usar uma ferramenta do VendMaster: bolinhas, consignados ou pelúcias.'
        },
        {
          '@type': 'Offer',
          name: 'Plano Operador - 2 ferramentas',
          price: '24.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          description:
            'Plano para operadores que desejam usar duas ferramentas do VendMaster.'
        },
        {
          '@type': 'Offer',
          name: 'Plano Completo - 3 ferramentas',
          price: '29.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          description:
            'Plano completo com controle de bolinhas, consignados e pelúcias no VendMaster.'
        }
      ]
    };

    return res.render('pages/precos', {
      title: 'Preços | VendMaster',
      metaDescription:
        'Veja os planos do VendMaster para operadores de máquinas recreativas. Escolha entre controle de bolinhas, consignados e pelúcias, com planos a partir de R$ 19,90 por mês.',
      canonicalUrl,
      breadcrumbJsonLd,
      offerCatalogJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/precos.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderPrivacyPolicy(req, res) {
    res.render('pages/legal/politicaDePrivacidade', {
      title: 'Política de Privacidade | VendMaster',
      metaDescription:
        'Entenda como o VendMaster trata dados enviados por formulários, contatos comerciais e uso do sistema.',
      canonicalUrl: 'https://vendmaster.com.br/politica-de-privacidade'
    });
  }

  renderTermsOfUse(req, res) {
    res.render('pages/legal/termosDeUso', {
      title: 'Termos de Uso | VendMaster',
      metaDescription:
        'Condições gerais de uso do VendMaster, sistema de gestão para máquinas recreativas e consignados.',
      canonicalUrl: 'https://vendmaster.com.br/termos-de-uso'
    });
  }
}

export default new HomepageController();
