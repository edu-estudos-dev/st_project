import FluxoDeCaixaModel from '../models/fluxoDeCaixaModel.js';

class FluxoDeCaixaController {

    calcularTotais = (fluxoDeCaixa, tiposEntradas, tiposSaidas, tipos) => {
        const dadosEntradas = {};
        const dadosSaidas = {};
        const totaisEntradas = new Array(12).fill(0);
        const totaisSaidas = new Array(12).fill(0);
        const somaMensal = new Array(12).fill(0);

        for (let tipo of tiposEntradas) {
            dadosEntradas[tipos[tipo]] = new Array(12).fill(0);
        }

        for (let tipo of tiposSaidas) {
            dadosSaidas[tipos[tipo]] = new Array(12).fill(0);
        }

        fluxoDeCaixa.forEach(lancamento => {
            const tipo = tipos[lancamento.tipo_de_lancamento] || lancamento.tipo_de_lancamento;
            const mesIndex = lancamento.mes - 1;
            const valor = parseFloat(lancamento.total) || 0;

            if (tiposEntradas.includes(lancamento.tipo_de_lancamento)) {
                dadosEntradas[tipo][mesIndex] += valor;
                totaisEntradas[mesIndex] += valor;
            } else if (tiposSaidas.includes(lancamento.tipo_de_lancamento)) {
                dadosSaidas[tipo][mesIndex] += valor;
                totaisSaidas[mesIndex] += valor;
            }

            somaMensal[mesIndex] = totaisEntradas[mesIndex] - totaisSaidas[mesIndex];
        });

        const somaTotalAnual = somaMensal.reduce((acc, curr) => acc + curr, 0);

        return { dadosEntradas, dadosSaidas, totaisEntradas, totaisSaidas, somaMensal, somaTotalAnual };
    }

    showFluxoDeCaixa = async (req, res) => {
        try {
            const year = req.query.year || new Date().getFullYear();
            const fluxoDeCaixa = await FluxoDeCaixaModel.criarFluxo(year);
    
            const tiposEntradas = ['receita_dos_pontos', 'incremento_de_capital'];
            const tiposSaidas = ['compra', 'extra', 'pro-labore', 'gastos_recorrentes', 'bonus'];
            const tipos = {
                'receita_dos_pontos': 'RECEITA DOS PONTOS',
                'incremento_de_capital': 'INCREMENTO DE CAPITAL',
                'compra': 'COMPRA',
                'extra': 'EXTRA',
                'pro-labore': 'PRO-LABORE',
                'gastos_recorrentes': 'GASTOS RECORRENTES',
                'bonus': 'BÔNUS'
            };
    
            const { dadosEntradas, dadosSaidas, totaisEntradas, totaisSaidas, somaMensal, somaTotalAnual } = this.calcularTotais(fluxoDeCaixa, tiposEntradas, tiposSaidas, tipos);
    
            // Supondo que você tenha as informações do usuário no req.session
            const usuario = req.session.user;
    
            res.render('pages/fluxoDeCaixa', { 
                dadosEntradas, 
                dadosSaidas, 
                totaisEntradas, 
                totaisSaidas, 
                somaMensal, 
                somaTotalAnual, 
                year, 
                usuario 
            });
        } catch (error) {
            console.error('Erro ao buscar fluxo de caixa:', error);
            res.status(500).send('Erro ao buscar fluxo de caixa');
        }
    };
    

    async getLancamentos(req, res) {
        try {
            const lancamentos = await FluxoDeCaixaModel.findAll();
            res.json(lancamentos);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar lançamentos' });
        }
    }
}

export default new FluxoDeCaixaController();
