import BolinhasSangriaModel from '../models/BolinhasModel.js';
import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';

class BolinhasController {
  // Método para exibir o formulário
  addSangriaForm = async (req, res) => {
    const usuario = req.user;

    try {
      const estabelecimentos = await BolinhasSangriaModel.getEstabelecimentos(
        usuario.assinante_id
      );

      const selectedEstabelecimentoId = req.query.estabelecimento_id
        ? String(req.query.estabelecimento_id)
        : '';

      const visitaId = req.query.visita_id ? String(req.query.visita_id) : '';

      const rotaId = req.query.rota_id ? String(req.query.rota_id) : '';

      const rotaPontoId = req.query.rota_ponto_id
        ? String(req.query.rota_ponto_id)
        : '';

      const origem = req.query.origem ? String(req.query.origem) : '';

      const retornoUrl = req.query.retorno_url
        ? String(req.query.retorno_url)
        : '/rotas';

      res.render('pages/bolinhas/cadastrarSangriaBolinha', {
        estabelecimentos,
        usuario,
        selectedEstabelecimentoId,
        visitaId,
        rotaId,
        rotaPontoId,
        origem,
        retornoUrl
      });
    } catch (error) {
      console.error('Erro ao carregar o formulário de sangria:', error);
      res.status(500).send('Erro ao carregar o formulário de sangria.');
    }
  };

  // Método para adicionar uma nova sangria
  addSangria = async (req, res) => {
    try {
      const usuario = req.user;

      const {
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        tipo_pagamento,
        observacoes,
        visita_id,
        rota_id,
        rota_ponto_id,
        origem,
        retorno_url
      } = req.body;

      const valorDaComissao =
        Number(valor_apurado || 0) * (Number(comissao || 0) / 100);
      const valorLiquido = Number(valor_apurado || 0) - valorDaComissao;

      const sangriaResult = await BolinhasSangriaModel.createSangria({
        assinante_id: usuario.assinante_id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        valor_comerciante: valorDaComissao,
        valor_liquido: valorLiquido,
        tipo_pagamento,
        observacoes
      });

      const sangriaId = sangriaResult?.rows?.[0]?.id || null;

      if (origem === 'rota' && visita_id && rota_ponto_id) {
        const retornoSeguro =
          retorno_url && String(retorno_url).startsWith('/rotas')
            ? String(retorno_url)
            : '/rotas';

        await VisitasModel.marcarProdutoRegistrado({
          visita_id,
          assinante_id: usuario.assinante_id,
          produto: 'BOLINHAS',
          sangria_id: sangriaId,
          observacoes: observacoes || null
        });

        try {
          await VisitasModel.finalizarVisita({
            visita_id,
            assinante_id: usuario.assinante_id,
            observacoes: observacoes || null
          });

          await RotasOperacionaisModel.marcarPontoVisitado({
            rota_ponto_id,
            assinante_id: usuario.assinante_id,
            observacao: observacoes || null
          });

          if (rota_id) {
            await RotasOperacionaisModel.finalizarRotaSeConcluida(
              rota_id,
              usuario.assinante_id
            );
          }

          const separador = retornoSeguro.includes('?') ? '&' : '?';

          return res.redirect(
            `${retornoSeguro}${separador}rota_ponto_finalizado=${encodeURIComponent(rota_ponto_id)}&success=${encodeURIComponent('Visita finalizada com sucesso')}`
          );
        } catch (finalizarError) {
          if (
            finalizarError.message &&
            finalizarError.message.includes('Ainda existem produtos pendentes')
          ) {
            const separador = retornoSeguro.includes('?') ? '&' : '?';

            return res.redirect(
              `${retornoSeguro}${separador}success=${encodeURIComponent('Bolinhas registrada. Ainda existem produtos pendentes nesta visita.')}`
            );
          }

          throw finalizarError;
        }
      }

      return res.redirect(
        '/bolinhas/sangrias?success=Sangria adicionada com sucesso'
      );
    } catch (error) {
      console.error('Erro ao adicionar sangria:', error);
      return res.redirect('/bolinhas/sangrias?error=Erro ao adicionar sangria');
    }
  };

  // Método para listar todas as sangrias
  index = async (req, res) => {
    const usuario = req.user;

    try {
      const sangriasFiltradas = await BolinhasSangriaModel.getSangrias(
        usuario.assinante_id
      );
      const { success, error } = req.query;
      res.render('pages/bolinhas/tabelaBolinha', {
        sangrias: sangriasFiltradas,
        usuario,
        success,
        error
      });
    } catch (error) {
      console.error('Erro ao listar sangrias:', error);
      res.status(500).send('Erro ao listar sangrias.');
    }
  };

  // Método para exibir o formulário de edição
  editSangriaForm = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;
      const estabelecimentos = await BolinhasSangriaModel.getEstabelecimentos(
        usuario.assinante_id
      );
      const sangria = await BolinhasSangriaModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria.length) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/bolinhas/editarSangiaBolinha', {
        estabelecimentos,
        sangria: sangria[0],
        usuario
      });
    } catch (error) {
      console.error(
        'Erro ao carregar o formulário de edição de sangria:',
        error
      );
      res
        .status(500)
        .send('Erro ao carregar o formulário de edição de sangria.');
    }
  };

  // Método para atualizar uma sangria
  updateSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const {
        id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao,
        tipo_pagamento,
        observacoes
      } = req.body;

      const valor_da_comissao = valor_apurado * (comissao / 100);
      const valor_liquido = valor_apurado - valor_da_comissao;

      await BolinhasSangriaModel.updateSangria({
        assinante_id: usuario.assinante_id,
        id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao: parseFloat(comissao),
        valor_comerciante: valor_da_comissao,
        valor_liquido,
        tipo_pagamento,
        observacoes
      });

      res.redirect('/bolinhas/sangrias?success=Sangria atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar sangria:', error);
      res.redirect('/bolinhas/sangrias?error=Erro ao atualizar sangria');
    }
  };

  // Método para deletar uma sangria
  deleteSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;
      await BolinhasSangriaModel.deleteSangria(id, usuario.assinante_id);
      res
        .status(200)
        .json({ success: true, message: 'Sangria excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar sangria:', error);
      res
        .status(500)
        .json({ success: false, message: 'Erro ao excluir sangria' });
    }
  };

  // Método para exibir os detalhes de uma sangria
  viewSangria = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;
      const sangria = await BolinhasSangriaModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (sangria.length === 0) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/bolinhas/visualizarDadosBolinha', {
        sangria: sangria[0],
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar os detalhes da sangria:', error);
      res.status(500).send('Erro ao carregar os detalhes da sangria.');
    }
  };

  // Método para obter a receita agrupada por mês e ano
  getReceitaBolinhas = async (req, res) => {
    const usuario = req.user;
    try {
      const receita = await BolinhasSangriaModel.getMonthlyRevenue(
        usuario.assinante_id
      );
      res.render('pages/bolinhas/receitaBolinha', {
        receita,
        usuario
      });
    } catch (error) {
      console.error('Erro ao obter receita de bolinhas:', error);
      res.status(500).json({ message: 'Erro ao obter receita de bolinhas.' });
    }
  };

  // Método para renderizar o controle geral
  renderControleGeral = async (req, res) => {
    const usuario = req.user;
    try {
      const dadosControleGeral = await BolinhasSangriaModel.getControleGeral(
        usuario.assinante_id
      );
      const bairros = await EstabelecimentoModel.getBairrosByProduto(
        'BOLINHAS',
        usuario.assinante_id
      );
      res.render('pages/bolinhas/controleGeralBolinhas', {
        estabelecimentos: dadosControleGeral,
        bairros: bairros,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar controle geral:', error);
      res.status(500).send('Erro ao carregar controle geral.');
    }
  };
}

export default new BolinhasController();
