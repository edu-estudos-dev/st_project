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
        text: 'O VendMaster possui planos para uma, duas ou três ferramentas, conforme a necessidade da operação. Você pode escolher entre controle de máquinas de bolinhas, consignados e pelúcias.'
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

      const postsRecentes = postsPublicados.map(post => ({
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
          price: '24.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          description:
            'Plano para operadores que desejam usar uma ferramenta do VendMaster: bolinhas, consignados ou pelúcias.'
        },
        {
          '@type': 'Offer',
          name: 'Plano Operador - 2 ferramentas',
          price: '34.90',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: canonicalUrl,
          description:
            'Plano para operadores que desejam usar duas ferramentas do VendMaster.'
        },
        {
          '@type': 'Offer',
          name: 'Plano Completo - 3 ferramentas',
          price: '44.90',
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
        'Veja os planos do VendMaster para operadores de máquinas recreativas. Escolha entre controle de bolinhas, consignados e pelúcias, com planos para uma, duas ou três ferramentas, conforme a necessidade da operação.',
      canonicalUrl,
      breadcrumbJsonLd,
      offerCatalogJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/precos.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderDemoPage(req, res) {
    const canonicalUrl = 'https://vendmaster.com.br/demonstracao';

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
          name: 'Demonstração',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'A demonstração do VendMaster é gratuita?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. A demonstração do VendMaster é gratuita e serve para mostrar como o sistema pode organizar rotas, sangrias, estoque, acertos e financeiro da operação.'
          }
        },
        {
          '@type': 'Question',
          name: 'Quanto tempo dura a demonstração?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A demonstração é objetiva e focada na realidade do operador, mostrando as ferramentas mais importantes para o tipo de operação informada.'
          }
        },
        {
          '@type': 'Question',
          name: 'Preciso instalar algum aplicativo para ver a demonstração?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. O VendMaster funciona pelo navegador, então a demonstração pode ser feita mostrando o sistema em funcionamento sem instalação de aplicativo.'
          }
        },
        {
          '@type': 'Question',
          name: 'Para quem é indicado o VendMaster?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O VendMaster é indicado para operadores de máquinas recreativas, máquinas de bolinhas, consignados e máquinas de pelúcias que precisam controlar pontos, rotas, sangrias, estoque e financeiro.'
          }
        }
      ]
    };

    return res.render('pages/demonstracao', {
      title: 'Demonstração gratuita | VendMaster',
      metaDescription:
        'Veja o VendMaster funcionando na prática. Solicite uma demonstração gratuita do sistema para operadores de máquinas recreativas, bolinhas, consignados e pelúcias.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/demonstracao.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderSistemaGestaoMaquinasPage(req, res) {
    const canonicalUrl =
      'https://vendmaster.com.br/sistema-gestao-maquinas-recreativas';

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
          name: 'Sistema de gestão para máquinas recreativas',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é um sistema de gestão para máquinas recreativas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'É uma ferramenta para organizar pontos, máquinas, rotas, sangrias, estoque, acertos e financeiro da operação em um só lugar.'
          }
        },
        {
          '@type': 'Question',
          name: 'O VendMaster serve para máquinas de bolinhas, pelúcias e consignados?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster foi pensado para operadores que trabalham com máquinas de bolinhas, máquinas de pelúcias e produtos consignados.'
          }
        },
        {
          '@type': 'Question',
          name: 'Preciso abandonar minha rotina atual para usar o sistema?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. A ideia é substituir controles soltos e planilhas por uma rotina mais organizada, mantendo o foco na operação de campo.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso ver uma demonstração antes de contratar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. É possível solicitar uma demonstração gratuita para ver como o VendMaster funciona na prática.'
          }
        }
      ]
    };

    return res.render('pages/sistemaGestaoMaquinasRecreativas', {
      title: 'Sistema de gestão para máquinas recreativas | VendMaster',
      metaDescription:
        'Sistema de gestão para máquinas recreativas. Controle pontos, rotas, sangrias, estoque, acertos, comissões e financeiro com o VendMaster.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/commercial-pages.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderControleSangriaBolinhasPage(req, res) {
    const canonicalUrl =
      'https://vendmaster.com.br/controle-sangria-maquinas-bolinhas';

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
          name: 'Controle de sangria de máquinas de bolinhas',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é controle de sangria de máquinas de bolinhas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'É o registro organizado das coletas feitas em cada ponto, com histórico por estabelecimento, data, valor, abastecimento e observações importantes da visita.'
          }
        },
        {
          '@type': 'Question',
          name: 'Por que controlar sangrias por ponto?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O controle por ponto ajuda o operador a entender onde coletou, quando coletou, quais locais precisam de atenção e quais máquinas estão com melhor ou pior desempenho.'
          }
        },
        {
          '@type': 'Question',
          name: 'O VendMaster substitui planilhas de sangria?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster ajuda a substituir anotações soltas e planilhas por registros organizados, com histórico e visão operacional mais clara.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso ver uma demonstração do controle de sangria?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Você pode solicitar uma demonstração gratuita para ver como o controle de sangria funciona na prática dentro do VendMaster.'
          }
        }
      ]
    };

    return res.render('pages/controleSangriaMaquinasBolinhas', {
      title: 'Controle de sangria de máquinas de bolinhas | VendMaster',
      metaDescription:
        'Controle de sangria de máquinas de bolinhas. Organize coletas, abastecimentos, histórico por ponto, rotas e acertos com o VendMaster.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/commercial-pages.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderRotaInteligentePage(req, res) {
    const canonicalUrl =
      'https://vendmaster.com.br/rota-inteligente-maquinas-recreativas';

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
          name: 'Rota inteligente para máquinas recreativas',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é rota inteligente para máquinas recreativas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'É uma forma de organizar visitas aos pontos com base em informações da operação, ajudando o operador a decidir quais locais precisam de coleta, reposição ou atenção.'
          }
        },
        {
          '@type': 'Question',
          name: 'A rota inteligente substitui minha experiência de campo?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. Ela ajuda a organizar dados e prioridades, mas a experiência do operador continua importante para tomar decisões no dia a dia.'
          }
        },
        {
          '@type': 'Question',
          name: 'A rota pode ajudar em sangrias e abastecimentos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. A organização da rota ajuda o operador a visitar pontos com maior necessidade de coleta, abastecimento ou conferência.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso ver a rota inteligente em uma demonstração?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Você pode solicitar uma demonstração gratuita para ver como a rota inteligente funciona dentro do VendMaster.'
          }
        }
      ]
    };

    return res.render('pages/rotaInteligenteMaquinasRecreativas', {
      title: 'Rota inteligente para máquinas recreativas | VendMaster',
      metaDescription:
        'Rota inteligente para máquinas recreativas. Organize visitas, prioridades, sangrias, abastecimentos e pontos com o VendMaster.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/commercial-pages.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderSistemaPeluciasPage(req, res) {
    const canonicalUrl =
      'https://vendmaster.com.br/sistema-para-maquinas-de-pelucias';

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
          name: 'Sistema para máquinas de pelúcias e gruas',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é um sistema para máquinas de pelúcias?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'É uma ferramenta para organizar pontos, estoque, reposição de prêmios, visitas, movimentações e histórico das máquinas de pelúcias.'
          }
        },
        {
          '@type': 'Question',
          name: 'O VendMaster ajuda no controle de estoque de pelúcias?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster ajuda a acompanhar estoque, reposições, saídas e movimentações relacionadas às máquinas de pelúcias.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso controlar visitas e pontos das máquinas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O sistema ajuda a organizar pontos, visitas, histórico e informações importantes de cada estabelecimento.'
          }
        },
        {
          '@type': 'Question',
          name: 'O sistema gera recibo para entregar ao comerciante?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster permite gerar um recibo da visita para entregar ao comerciante, ajudando no controle do que foi registrado no ponto.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso ver uma demonstração antes de contratar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Você pode solicitar uma demonstração gratuita para ver como o controle de máquinas de pelúcias funciona dentro do VendMaster.'
          }
        }
      ]
    };

    return res.render('pages/sistemaParaMaquinasDePelucias', {
      title: 'Sistema para máquinas de pelúcias e gruas | VendMaster',
      metaDescription:
        'Sistema para máquinas de pelúcias e gruas. Controle pontos, estoque, reposição de prêmios, visitas, movimentações e histórico com o VendMaster.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/commercial-pages.css'],
      skipGlobalStyles: true,
      preloadExtraStyles: false
    });
  }

  renderControleConsignadosPage(req, res) {
    const canonicalUrl =
      'https://vendmaster.com.br/controle-consignados-comissao';

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
          name: 'Controle de consignados e comissão',
          item: canonicalUrl
        }
      ]
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é controle de consignados e comissão?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'É o controle dos produtos deixados em cada ponto, do que foi vendido, do que foi reposto, da comissão do parceiro e do valor líquido do acerto.'
          }
        },
        {
          '@type': 'Question',
          name: 'O VendMaster ajuda a controlar comissão de parceiros?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster ajuda a organizar vendido, reposto, comissão e acerto por estabelecimento, deixando o processo mais claro.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso acompanhar estoque deixado e vendido?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O sistema ajuda a registrar entradas, saídas, reposições e movimentações de produtos consignados por ponto.'
          }
        },
        {
          '@type': 'Question',
          name: 'O sistema gera recibo do acerto para o comerciante?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. O VendMaster permite gerar um recibo da visita ou do acerto, ajudando o comerciante a ter um comprovante do que foi registrado.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso ver uma demonstração antes de contratar?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim. Você pode solicitar uma demonstração gratuita para ver como o controle de consignados e comissão funciona dentro do VendMaster.'
          }
        }
      ]
    };

    return res.render('pages/controleConsignadosComissao', {
      title: 'Controle de consignados e comissão | VendMaster',
      metaDescription:
        'Controle de consignados e comissão. Organize produtos deixados, vendidos, repostos, comissão do parceiro e acertos por ponto com o VendMaster.',
      canonicalUrl,
      breadcrumbJsonLd,
      faqJsonLd,
      extraStyles: ['/css/blog-public-header.css', '/css/commercial-pages.css'],
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
