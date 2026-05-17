import BolinhasSangriaModel from '../models/BolinhasModel.js';
import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';
import { recalculateConsolidatedRevenueForDates } from '../services/monthlyRevenueConsolidation.js';
import { buildPagination, parsePagination } from '../utilities/pagination.js';
import {
  parseCommissionPercent,
  parseNonNegativeDecimal,
  parsePaymentType,
  parsePositiveIntegerId,
  parseSangriaDate
} from '../utilities/sangriaValidation.js';

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

    const rotaRetornoUrl = req.query.rota_retorno_url
      ? String(req.query.rota_retorno_url)
      : '/rotas';

    res.render('pages/bolinhas/cadastrarSangriaBolinha', {
      estabelecimentos,
      usuario,
      selectedEstabelecimentoId,
      visitaId,
      rotaId,
      rotaPontoId,
      origem,
      retornoUrl,
      rotaRetornoUrl
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
      retorno_url,
      rota_retorno_url
    } = req.body;

    const estabelecimentoId = parsePositiveIntegerId(
      estabelecimento_id,
      'Estabelecimento'
    );
    const dataSangria = parseSangriaDate(data_sangria);
    const valorApurado = parseNonNegativeDecimal(
      valor_apurado,
      'Valor apurado'
    );
    const percentualComissao = parseCommissionPercent(comissao);
    const tipoPagamento = parsePaymentType(tipo_pagamento);

    const hasSameDate = await BolinhasSangriaModel.hasSangriaOnDate({
      estabelecimentoId,
      assinanteId: usuario.assinante_id,
      dataSangria
    });

    if (hasSameDate) {
      throw new Error('Este ponto ja possui uma sangria de bolinhas nesta data. Edite o registro existente ou escolha outra data.');
    }

    const valorDaComissao = valorApurado * (percentualComissao / 100);

    const valorLiquido = valorApurado - valorDaComissao;

    let routeContext = null;

    if (origem === 'rota' && visita_id && rota_ponto_id) {
      const retornoSeguro =
        retorno_url && String(retorno_url).startsWith('/rotas')
          ? String(retorno_url)
          : '/rotas';

      const rotaRetornoSeguro =
        rota_retorno_url && String(rota_retorno_url).startsWith('/rotas')
          ? String(rota_retorno_url)
          : '/rotas';

      const visitaDaRota = await VisitasModel.findVisitaById(
        visita_id,
        usuario.assinante_id
      );

      if (
        !visitaDaRota ||
        visitaDaRota.status !== 'em_andamento' ||
        Number(visitaDaRota.estabelecimento_id) !== Number(estabelecimentoId) ||
        Number(visitaDaRota.rota_ponto_id) !== Number(rota_ponto_id)
      ) {
        throw new Error('A visita informada nao pertence a este ponto da rota ou ja foi finalizada.');
      }

      const produtoDaVisita = await VisitasModel.findProdutoByVisita({
        visita_id,
        assinante_id: usuario.assinante_id,
        produto: 'BOLINHAS'
      });

      if (!produtoDaVisita || produtoDaVisita.status !== 'pendente') {
        throw new Error('Bolinhas ja foi registrada ou nao esta pendente nesta visita.');
      }

      routeContext = {
        retornoSeguro,
        rotaRetornoSeguro
      };
    }

    const sangriaResult = await BolinhasSangriaModel.createSangria({
      assinante_id: usuario.assinante_id,
      estabelecimento_id: estabelecimentoId,
      data_sangria: dataSangria,
      valor_apurado: valorApurado,
      comissao: percentualComissao,
      valor_comerciante: valorDaComissao,
      valor_liquido: valorLiquido,
      tipo_pagamento: tipoPagamento,
      observacoes
    });

    const sangriaId = sangriaResult?.rows?.[0]?.id || null;

    await recalculateConsolidatedRevenueForDates({
      produto: 'bolinhas',
      assinanteId: usuario.assinante_id,
      dates: [dataSangria]
    });

    if (routeContext) {
      const produtoRegistrado = await VisitasModel.marcarProdutoRegistrado({
        visita_id,
        assinante_id: usuario.assinante_id,
        produto: 'BOLINHAS',
        sangria_id: sangriaId,
        observacoes: observacoes || null
      });

      if (!produtoRegistrado) {
        throw new Error('Bolinhas ja foi registrada ou nao esta pendente nesta visita.');
      }

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

        const separador = routeContext.rotaRetornoSeguro.includes('?') ? '&' : '?';

        return res.redirect(
          `${routeContext.rotaRetornoSeguro}${separador}rota_ponto_finalizado=${encodeURIComponent(
            rota_ponto_id
          )}&success=${encodeURIComponent('Visita finalizada com sucesso')}`
        );
      } catch (finalizarError) {
        if (
          finalizarError.message &&
          finalizarError.message.includes('Ainda existem produtos pendentes')
        ) {
          const separador = routeContext.retornoSeguro.includes('?') ? '&' : '?';

          return res.redirect(
            `${routeContext.retornoSeguro}${separador}success=${encodeURIComponent(
              'Bolinhas registrada. Ainda existem produtos pendentes nesta visita.'
            )}`
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
    return res.redirect(
      `/bolinhas/sangrias?error=${encodeURIComponent(
        error.message || 'Erro ao adicionar sangria'
      )}`
    );
  }
};
  // Método para listar todas as sangrias
  index = async (req, res) => {
    const usuario = req.user;

    try {
      const pageOptions = parsePagination(req.query);
      const {
        rows: sangriasFiltradas,
        total
      } = await BolinhasSangriaModel.getSangriasPage(
        usuario.assinante_id,
        pageOptions
      );
      const { success, error } = req.query;
      res.render('pages/bolinhas/tabelaBolinha', {
        sangrias: sangriasFiltradas,
        usuario,
        success,
        error,
        pagination: buildPagination({
          ...pageOptions,
          totalItems: total,
          basePath: '/bolinhas/sangrias',
          query: req.query
        })
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

      const estabelecimentoId = parsePositiveIntegerId(
        estabelecimento_id,
        'Estabelecimento'
      );
      const dataSangria = parseSangriaDate(data_sangria);
      const valorApurado = parseNonNegativeDecimal(
        valor_apurado,
        'Valor apurado'
      );
      const percentualComissao = parseCommissionPercent(comissao);
      const tipoPagamento = parsePaymentType(tipo_pagamento);
      const valor_da_comissao = valorApurado * (percentualComissao / 100);
      const valor_liquido = valorApurado - valor_da_comissao;

      const sangriaAtual = await BolinhasSangriaModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangriaAtual.length) {
        return res.redirect('/bolinhas/sangrias?error=Sangria nao encontrada');
      }

      const hasSameDate = await BolinhasSangriaModel.hasSangriaOnDate({
        estabelecimentoId,
        assinanteId: usuario.assinante_id,
        dataSangria,
        excludeId: id
      });

      if (hasSameDate) {
        throw new Error('Este ponto ja possui outra sangria de bolinhas nesta data. Edite o registro existente ou escolha outra data.');
      }

      const produtoVinculado = await VisitasModel.findProdutoBySangria({
        sangria_id: id,
        assinante_id: usuario.assinante_id,
        produto: 'BOLINHAS'
      });

      if (
        produtoVinculado &&
        Number(sangriaAtual[0].estabelecimento_id) !== Number(estabelecimentoId)
      ) {
        throw new Error('Sangria vinculada a visita guiada nao pode trocar de estabelecimento.');
      }

      await BolinhasSangriaModel.updateSangria({
        assinante_id: usuario.assinante_id,
        id,
        estabelecimento_id: estabelecimentoId,
        data_sangria: dataSangria,
        valor_apurado: valorApurado,
        comissao: percentualComissao,
        valor_comerciante: valor_da_comissao,
        valor_liquido,
        tipo_pagamento: tipoPagamento,
        observacoes
      });

      await recalculateConsolidatedRevenueForDates({
        produto: 'bolinhas',
        assinanteId: usuario.assinante_id,
        dates: [sangriaAtual[0].data_sangria, dataSangria]
      });

      res.redirect('/bolinhas/sangrias?success=Sangria atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar sangria:', error);
      res.redirect(
        `/bolinhas/sangrias?error=${encodeURIComponent(
          error.message || 'Erro ao atualizar sangria'
        )}`
      );
    }
  };

  // Método para deletar uma sangria
  deleteSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;
      const sangriaAtual = await BolinhasSangriaModel.getSangriaById(
        id,
        usuario.assinante_id
      );
      const result = await BolinhasSangriaModel.deleteSangria(id, usuario.assinante_id);

      if (result.rowCount === 0) {
        return res.status(409).json({
          success: false,
          message: 'Esta sangria nao pode ser excluida porque esta vinculada a uma visita ou nao foi encontrada.'
        });
      }

      await recalculateConsolidatedRevenueForDates({
        produto: 'bolinhas',
        assinanteId: usuario.assinante_id,
        dates: [sangriaAtual?.[0]?.data_sangria]
      });

      res
        .status(200)
        .json({ success: true, message: 'Sangria excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar sangria:', error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || 'Erro ao excluir sangria'
        });
    }
  };

    updatePixConfirmado = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;
      const { pix_confirmado } = req.body;

      if (!['SIM', 'NAO'].includes(pix_confirmado)) {
        return res.status(400).json({
          success: false,
          message: 'Informe se o PIX foi confirmado.'
        });
      }

      const pixConfirmadoBoolean = pix_confirmado === 'SIM';

      const sangriaAtualizada = await BolinhasSangriaModel.updatePixConfirmado({
        id,
        assinante_id: usuario.assinante_id,
        pix_confirmado: pixConfirmadoBoolean
      });

      return res.status(200).json({
        success: true,
        message: pixConfirmadoBoolean
          ? 'PIX marcado como confirmado.'
          : 'PIX marcado como não confirmado.',
        pix_confirmado: sangriaAtualizada.pix_confirmado,
        pix_confirmado_em: sangriaAtualizada.pix_confirmado_em
      });
    } catch (error) {
      console.error('Erro ao atualizar confirmação de PIX:', error);

      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar confirmação do PIX.'
      });
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
