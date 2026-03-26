import figurinhasModel from '../models/figurinhasModel.js';

class FigurinhasController {
  addSangriaForm = async (req, res) => {
    const usuario = req.user || null;
    try {
      const estabelecimentos = await figurinhasModel.getEstabelecimentos();
      res.render('pages/figurinhas/cadastrarSangriaFigurinha', {
        estabelecimentos,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      res.status(500).send('Erro ao carregar formulário.');
    }
  };

  addSangria = async (req, res) => {
    try {
      const {
        estabelecimento_id,
        data_sangria,
        abastecido,
        qtde_vendido,
        valor_apurado,
        tipo_pagamento,
        observacoes
      } = req.body;

      if (!estabelecimento_id || !data_sangria) {
        throw new Error('Dados obrigatórios faltando');
      }

      // 🔥 BUSCA ÚLTIMA SANGRIA
      const ultimaSangria =
        await figurinhasModel.getUltimaSangria(estabelecimento_id);

      const estoqueAnterior =
        ultimaSangria.length > 0 ? parseInt(ultimaSangria[0].qtde_deixada) : 0;

      // 🔥 CÁLCULO CORRETO
      const qtde_deixada =
        estoqueAnterior -
        parseInt(qtde_vendido || 0) +
        parseInt(abastecido || 0);

      if (qtde_deixada < 0) {
        throw new Error('Estoque não pode ser negativo');
      }

      await figurinhasModel.createSangria({
        estabelecimento_id,
        data_sangria,
        qtde_deixada,
        abastecido: parseInt(abastecido || 0),
        estoque: estoqueAnterior,
        qtde_vendido: parseInt(qtde_vendido || 0),
        valor_apurado: parseFloat(valor_apurado || 0),
        tipo_pagamento,
        observacoes: observacoes || ''
      });

      res.redirect(
        '/figurinhas/sangrias?success=Sangria adicionada com sucesso'
      );
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      res.redirect(
        '/figurinhas/sangrias?error=' + encodeURIComponent(error.message)
      );
    }
  };

  index = async (req, res) => {
    const usuario = req.user;
    try {
      const sangrias = await figurinhasModel.getSangrias();
      const { success, error } = req.query;

      res.render('pages/figurinhas/tabelaFigurinha', {
        sangrias,
        usuario,
        success,
        error
      });
    } catch (error) {
      console.error('Erro ao listar:', error);
      res.status(500).send('Erro ao listar.');
    }
  };

  editSangriaForm = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;

      const estabelecimentos = await figurinhasModel.getEstabelecimentos();
      const sangria = await figurinhasModel.getSangriaById(id);

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/figurinhas/editarSangriaFigurinha', {
        estabelecimentos,
        sangria,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar edição:', error);
      res.status(500).send('Erro ao carregar edição.');
    }
  };

  updateSangria = async (req, res) => {
    try {
      const {
        id,
        estabelecimento_id,
        data_sangria,
        abastecido,
        qtde_vendido,
        valor_apurado,
        tipo_pagamento,
        observacoes
      } = req.body;

      const ultimaSangria =
        await figurinhasModel.getUltimaSangria(estabelecimento_id);

      const estoqueAnterior =
        ultimaSangria.length > 0 ? parseInt(ultimaSangria[0].qtde_deixada) : 0;

      const qtde_deixada =
        estoqueAnterior -
        parseInt(qtde_vendido || 0) +
        parseInt(abastecido || 0);

      if (qtde_deixada < 0) {
        throw new Error('Estoque não pode ser negativo');
      }

      await figurinhasModel.updateSangria({
        id,
        estabelecimento_id,
        data_sangria,
        qtde_deixada,
        abastecido: parseInt(abastecido || 0),
        estoque: estoqueAnterior,
        qtde_vendido: parseInt(qtde_vendido || 0),
        valor_apurado: parseFloat(valor_apurado || 0),
        tipo_pagamento,
        observacoes: observacoes || ''
      });

      res.redirect('/figurinhas/sangrias?success=Atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      res.redirect(
        '/figurinhas/sangrias?error=' + encodeURIComponent(error.message)
      );
    }
  };

  deleteSangria = async (req, res) => {
    try {
      const id = req.params.id;

      await figurinhasModel.deleteSangria(id);

      res.status(200).json({
        success: true,
        message: 'Excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir'
      });
    }
  };

  viewSangria = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;

      const sangria = await figurinhasModel.getSangriaById(id);

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/figurinhas/visualizarDadosFigurinha', {
        sangria,
        usuario
      });
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      res.status(500).send('Erro ao visualizar.');
    }
  };

  getReceitaFigurinhas = async (req, res) => {
    const usuario = req.user;
    try {
      const receita = await figurinhasModel.getMonthlyRevenue();

      res.render('pages/figurinhas/receitaFigurinha', {
        receita,
        usuario
      });
    } catch (error) {
      console.error('Erro receita:', error);
      res.status(500).send('Erro ao carregar receita.');
    }
  };

  renderControleGeralFigurinhas = async (req, res) => {
    const usuario = req.user;
    try {
      const dados =
        await figurinhasModel.getLatestSangriaForAllEstabelecimentos();

      res.render('pages/figurinhas/controleGeralFigurinhas', {
        estabelecimentos: dados,
        usuario
      });
    } catch (error) {
      console.error('Erro controle geral:', error);
      res.status(500).send('Erro no controle geral.');
    }
  };

  getUltimaSangria = async (req, res) => {
    try {
      const estabelecimentoId = req.params.id;

      const result = await figurinhasModel.getUltimaSangria(estabelecimentoId);

      if (result.length === 0) {
        return res.json({
          estoque: 0,
          data: null
        });
      }

      res.json({
        estoque: result[0].qtde_deixada,
        data: result[0].data_sangria
      });
    } catch (error) {
      console.error('Erro ao buscar última sangria:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}

export default new FigurinhasController();
