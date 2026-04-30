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
                text: 'N\u00e3o. O acesso \u00e9 feito pelo navegador, com login e senha.'
            }
        },
        {
            '@type': 'Question',
            name: 'Serve para bolinhas, pel\u00facias e consignados?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sim. Cada frente pode ter controles pr\u00f3prios, mantendo uma vis\u00e3o geral da opera\u00e7\u00e3o.'
            }
        },
        {
            '@type': 'Question',
            name: 'Consigo controlar comiss\u00e3o do parceiro?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sim. O objetivo \u00e9 registrar vendido, reposto, comiss\u00e3o e valor l\u00edquido de forma clara para facilitar o acerto.'
            }
        },
        {
            '@type': 'Question',
            name: 'Quanto custa?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Os planos come\u00e7am a partir de R$ 97 por m\u00eas para opera\u00e7\u00f5es menores. A proposta final depende da quantidade de pontos e frentes utilizadas.'
            }
        },
        {
            '@type': 'Question',
            name: 'Em quanto tempo recebo retorno?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Respondemos em at\u00e9 24h, preferencialmente pelo WhatsApp informado no formul\u00e1rio.'
            }
        }
    ]
};

class HomepageController {
    renderHomepage(req, res) {
        console.log('Renderizando pagina inicial');
        res.render('pages/homepage', {
            title: 'Sistema de gest\u00e3o para m\u00e1quinas recreativas e consignados | VendMaster',
            metaDescription: 'Sistema de gest\u00e3o para m\u00e1quinas recreativas, bolinhas, gruas e consignados. Organize pontos, sangrias, rotas, estoque, comiss\u00f5es e financeiro.',
            canonicalUrl: 'https://vendmaster.com.br/',
            faqJsonLd: homepageFaqJsonLd
        });
    }

    renderPrivacyPolicy(req, res) {
        res.render('pages/legal/politicaDePrivacidade', {
            title: 'Pol\u00edtica de Privacidade | VendMaster',
            metaDescription: 'Entenda como o VendMaster trata dados enviados por formul\u00e1rios, contatos comerciais e uso do sistema.',
            canonicalUrl: 'https://vendmaster.com.br/politica-de-privacidade'
        });
    }

    renderTermsOfUse(req, res) {
        res.render('pages/legal/termosDeUso', {
            title: 'Termos de Uso | VendMaster',
            metaDescription: 'Condi\u00e7\u00f5es gerais de uso do VendMaster, sistema de gest\u00e3o para m\u00e1quinas recreativas e consignados.',
            canonicalUrl: 'https://vendmaster.com.br/termos-de-uso'
        });
    }
}

export default new HomepageController();
