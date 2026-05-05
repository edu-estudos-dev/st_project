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
                text: 'Os planos começam a partir de R$ 19,90 por mês por produto para operações menores. A proposta final depende da quantidade de pontos e frentes utilizadas.'
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

            const postsRecentes = postsPublicados.slice(0, 2).map((post) => ({
                titulo: post.titulo,
                slug: post.slug,
                categoria: post.categoria,
                resumo: post.resumo,
                imagem: post.imagem_capa || '/images/brand/logo.webp'
            }));

            return res.render('pages/homepage', {
              title: 'Sistema de gestão para máquinas recreativas e consignados | VendMaster',
              metaDescription: 'Sistema de gestão para máquinas recreativas, bolinhas, gruas e consignados. Organize pontos, sangrias, rotas, estoque, comissões e financeiro.',
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

    renderPrivacyPolicy(req, res) {
        res.render('pages/legal/politicaDePrivacidade', {
            title: 'Política de Privacidade | VendMaster',
            metaDescription: 'Entenda como o VendMaster trata dados enviados por formulários, contatos comerciais e uso do sistema.',
            canonicalUrl: 'https://vendmaster.com.br/politica-de-privacidade'
        });
    }

    renderTermsOfUse(req, res) {
        res.render('pages/legal/termosDeUso', {
            title: 'Termos de Uso | VendMaster',
            metaDescription: 'Condições gerais de uso do VendMaster, sistema de gestão para máquinas recreativas e consignados.',
            canonicalUrl: 'https://vendmaster.com.br/termos-de-uso'
        });
    }
}

export default new HomepageController();