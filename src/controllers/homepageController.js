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
            title: 'VendMaster | Roteiro Inteligente para M\u00e1quinas Recreativas',
            metaDescription: 'Pare de improvisar a rota. O VendMaster organiza pontos, sangrias e financeiro para voc\u00ea sair sabendo onde coletar, sem planilha e sem achismo.',
            canonicalUrl: 'https://vendmaster.com.br/',
            faqJsonLd: homepageFaqJsonLd
        });
    }
}

export default new HomepageController();
