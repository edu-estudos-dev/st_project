import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import LancamentoModel from '../models/lancamentoModel.js';

class SearchController {
    // Método para buscar em estabelecimentos e lançamentos
    search = async (req, res) => {
        const { termo } = req.body;
        const usuario = req.user;
        if (!termo || termo.trim() === '') {
            console.error('Erro: O termo de pesquisa não pode ser vazio.');
            return res.status(400).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                title: 'Erro na Pesquisa',
                estabelecimentos: [],
                search: true,
                usuario,
                mensagem: 'O termo de pesquisa não pode ser vazio.'
            });
        }
        try {
            const estabelecimentos = await EstabelecimentoModel.search(termo);
            const lancamentos = await LancamentoModel.search(termo);

            if (estabelecimentos.length > 0 && lancamentos.length > 0) {
                res.status(200).render('pages/searchResults', {
                    title: 'Resultados da Pesquisa',
                    estabelecimentos,
                    lancamentos,
                    usuario
                });
            } else if (estabelecimentos.length > 0) {
                res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                    title: 'Resultados da Pesquisa - Estabelecimentos',
                    estabelecimentos,
                    search: true,
                    usuario
                });
            } else if (lancamentos.length > 0) {
                res.status(200).render('pages/lancamentos/tabelaLancamento', {
                    title: 'Resultados da Pesquisa - Lançamentos',
                    lancamentos,
                    search: true,
                    usuario
                });
            } else {
                res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                    title: 'Nenhum Resultado Encontrado',
                    estabelecimentos: [],
                    search: true,
                    usuario,
                    mensagem: 'Nenhum resultado encontrado para o termo de pesquisa.'
                });
            }
        } catch (error) {
            res.status(500).send('Erro ao buscar estabelecimentos ou lançamentos.');
        }
    }
}

export default new SearchController();

