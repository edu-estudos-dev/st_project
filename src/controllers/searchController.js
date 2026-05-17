import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import LancamentoModel from '../models/lancamentoModel.js';
import {
  normalizeSearchTerm,
  SearchValidationError
} from '../utilities/searchValidation.js';

class SearchController {
  search = async (req, res) => {
    const usuario = req.user;

    try {
      const termo = normalizeSearchTerm(req.body?.termo);
      const estabelecimentos = await EstabelecimentoModel.search(
        termo,
        usuario.assinante_id
      );
      const lancamentos = await LancamentoModel.search(
        termo,
        usuario.assinante_id
      );

      if (estabelecimentos.length > 0 && lancamentos.length > 0) {
        return res.status(200).render('pages/searchResults', {
          title: 'Resultados da Pesquisa',
          estabelecimentos,
          lancamentos,
          usuario
        });
      }

      if (estabelecimentos.length > 0) {
        return res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
          title: 'Resultados da Pesquisa - Estabelecimentos',
          estabelecimentos,
          search: true,
          usuario
        });
      }

      if (lancamentos.length > 0) {
        return res.status(200).render('pages/lancamentos/tabelaLancamento', {
          title: 'Resultados da Pesquisa - Lancamentos',
          lancamentos,
          search: true,
          usuario
        });
      }

      return res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
        title: 'Nenhum Resultado Encontrado',
        estabelecimentos: [],
        search: true,
        usuario,
        mensagem: 'Nenhum resultado encontrado para o termo de pesquisa.'
      });
    } catch (error) {
      if (error instanceof SearchValidationError) {
        return res.status(400).render('pages/estabelecimentos/tabelaEstabelecimentos', {
          title: 'Erro na Pesquisa',
          estabelecimentos: [],
          search: true,
          usuario,
          mensagem: error.message
        });
      }

      console.error('Erro ao buscar estabelecimentos ou lancamentos:', error);
      return res.status(500).send('Erro ao buscar estabelecimentos ou lancamentos.');
    }
  };
}

export default new SearchController();
