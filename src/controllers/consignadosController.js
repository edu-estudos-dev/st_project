import consignadosModel from '../models/consignadosModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';
import { recalculateConsolidatedRevenueForDates } from '../services/monthlyRevenueConsolidation.js';
import {
  gerarNomeArquivoRecibo,
  gerarReciboPdfBuffer
} from '../utils/reciboPdf.js';
import { buildPagination, parsePagination } from '../utilities/pagination.js';
import {
  parseNonNegativeDecimal,
  parseNonNegativeInteger,
  parsePaymentType,
  parsePositiveIntegerId,
  parseSangriaDate
} from '../utilities/sangriaValidation.js';

class ConsignadosController {
  addSangriaForm = async (req, res) => {
    const usuario = req.user || null;

    try {
      const estabelecimentos = await consignadosModel.getEstabelecimentos(
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
        : retornoUrl;

      res.render('pages/consignados/cadastrarSangriaConsignado', {
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
      console.error('Erro ao carregar formulário:', error);
      res.status(500).send('Erro ao carregar formulário.');
    }
  };

  addSangria = async (req, res) => {
    try {
      const usuario = req.user;

      const {
        estabelecimento_id,
        data_sangria,
        abastecido,
        qtde_vendido,
        valor_apurado,
        tipo_pagamento,
        observacoes,
        abertura_inicial,
        quantidade_inicial,
        visita_id,
        rota_id,
        rota_ponto_id,
        origem,
        retorno_url,
        rota_retorno_url
      } = req.body;

      if (!estabelecimento_id || !data_sangria) {
        throw new Error('Dados obrigatórios faltando.');
      }

      const estabelecimentoId = parsePositiveIntegerId(
        estabelecimento_id,
        'Estabelecimento'
      );
      const dataSangria = parseSangriaDate(data_sangria);

      const ultimaSangria = await consignadosModel.getUltimaSangria(
        estabelecimentoId,
        usuario.assinante_id
      );

      const isAberturaInicial = abertura_inicial === 'on';
      const hasHistorico = ultimaSangria.length > 0;

      if (isAberturaInicial) {
        if (hasHistorico) {
          throw new Error(
            'Este estabelecimento já possui histórico de consignados. Use o cadastro normal de visita.'
          );
        }

        const quantidadeInicial = parseNonNegativeInteger(
          quantidade_inicial,
          'Quantidade inicial'
        );

        await consignadosModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id: estabelecimentoId,
          data_sangria: dataSangria,
          qtde_deixada: quantidadeInicial,
          abastecido: quantidadeInicial,
          estoque: 0,
          qtde_vendido: 0,
          valor_apurado: 0,
          tipo_pagamento: 'especie',
          observacoes:
            `[ABERTURA INICIAL] ${observacoes || 'Ponto iniciado com estoque base.'}`.trim()
        });

        return res.redirect(
          '/consignados/sangrias?success=Abertura inicial de consignados cadastrada com sucesso'
        );
      }

      if (!hasHistorico) {
        throw new Error(
          'Este ponto ainda não possui registro inicial de consignados. Faça primeiro o cadastro inicial.'
        );
      }

      const estoqueAnterior = parseInt(ultimaSangria[0].qtde_deixada, 10);

      const quantidadeVendida = parseNonNegativeInteger(
        qtde_vendido,
        'Quantidade vendida'
      );
      const quantidadeAbastecida = parseNonNegativeInteger(
        abastecido,
        'Quantidade abastecida'
      );
      const valorApurado = parseNonNegativeDecimal(
        valor_apurado,
        'Valor apurado'
      );
      const tipoPagamento = parsePaymentType(tipo_pagamento);

      const qtdeDeixada =
        estoqueAnterior - quantidadeVendida + quantidadeAbastecida;

      if (qtdeDeixada < 0) {
        throw new Error('O estoque não pode ficar negativo.');
      }

      let routeContext = null;

      if (origem === 'rota' && visita_id && rota_ponto_id) {
        const retornoSeguro =
          retorno_url && String(retorno_url).startsWith('/rotas')
            ? String(retorno_url)
            : '/rotas';

        const rotaRetornoSeguro =
          rota_retorno_url && String(rota_retorno_url).startsWith('/rotas')
            ? String(rota_retorno_url)
            : retornoSeguro;

        const visitaDaRota = await VisitasModel.findVisitaById(
          visita_id,
          usuario.assinante_id
        );

        if (
          !visitaDaRota ||
          visitaDaRota.status !== 'em_andamento' ||
          Number(visitaDaRota.estabelecimento_id) !==
            Number(estabelecimentoId) ||
          Number(visitaDaRota.rota_ponto_id) !== Number(rota_ponto_id)
        ) {
          throw new Error(
            'A visita informada nao pertence a este ponto da rota ou ja foi finalizada.'
          );
        }

        const produtoDaVisita = await VisitasModel.findProdutoByVisita({
          visita_id,
          assinante_id: usuario.assinante_id,
          produto: 'CONSIGNADOS'
        });

        if (!produtoDaVisita || produtoDaVisita.status !== 'pendente') {
          throw new Error(
            'Consignados ja foi registrado ou nao esta pendente nesta visita.'
          );
        }

        routeContext = {
          retornoSeguro,
          rotaRetornoSeguro
        };
      }

      const sangriaResult = await consignadosModel.createSangria({
        assinante_id: usuario.assinante_id,
        estabelecimento_id: estabelecimentoId,
        data_sangria: dataSangria,
        qtde_deixada: qtdeDeixada,
        abastecido: quantidadeAbastecida,
        estoque: estoqueAnterior,
        qtde_vendido: quantidadeVendida,
        valor_apurado: valorApurado,
        tipo_pagamento: tipoPagamento,
        observacoes: observacoes || ''
      });

      const sangriaId = sangriaResult?.rows?.[0]?.id || null;

      const reciboUrl = sangriaId
        ? `/consignados/sangrias/recibo/${sangriaId}`
        : '';

      await recalculateConsolidatedRevenueForDates({
        produto: 'consignados',
        assinanteId: usuario.assinante_id,
        dates: [dataSangria]
      });

      if (routeContext) {
        const produtoRegistrado = await VisitasModel.marcarProdutoRegistrado({
          visita_id,
          assinante_id: usuario.assinante_id,
          produto: 'CONSIGNADOS',
          sangria_id: sangriaId,
          observacoes: observacoes || null
        });

        if (!produtoRegistrado) {
          throw new Error(
            'Consignados ja foi registrado ou nao esta pendente nesta visita.'
          );
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
            )}&success=${encodeURIComponent(
              'Visita finalizada com sucesso'
            )}&recibo_url=${encodeURIComponent(reciboUrl)}`
          );
        } catch (finalizarError) {
          if (
            finalizarError.message &&
            finalizarError.message.includes('Ainda existem produtos pendentes')
          ) {
            const separador = routeContext.retornoSeguro.includes('?') ? '&' : '?';

            return res.redirect(
              `${routeContext.retornoSeguro}${separador}success=${encodeURIComponent(
                'Consignados registrado. Ainda existem produtos pendentes nesta visita.'
              )}&recibo_url=${encodeURIComponent(reciboUrl)}`
            );
          }

          throw finalizarError;
        }
      }

      return res.redirect(
        `/consignados/sangrias?success=${encodeURIComponent(
          'Sangria adicionada com sucesso'
        )}&recibo_url=${encodeURIComponent(reciboUrl)}`
      );
    } catch (error) {
      console.error('Erro ao adicionar sangria de consignados:', error);
      return res.redirect(
        `/consignados/sangrias?error=${encodeURIComponent(error.message)}`
      );
    }
  };

  index = async (req, res) => {
    const usuario = req.user;
    try {
      const pageOptions = parsePagination(req.query);
      const { rows: sangrias, total } = await consignadosModel.getSangriasPage(
        usuario.assinante_id,
        pageOptions
      );
      const { success, error } = req.query;

      res.render('pages/consignados/tabelaConsignados', {
        sangrias,
        usuario,
        success,
        error,
        pagination: buildPagination({
          ...pageOptions,
          totalItems: total,
          basePath: '/consignados/sangrias',
          query: req.query
        })
      });
    } catch (error) {
      console.error('Erro ao listar consignados:', error);
      res.status(500).send('Erro ao listar.');
    }
  };

  editSangriaForm = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;

      const estabelecimentos = await consignadosModel.getEstabelecimentos(
        usuario.assinante_id
      );
      const sangria = await consignadosModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/consignados/editarSangriaConsignado', {
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
      const usuario = req.user;
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

      const sangriaAtual = await consignadosModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangriaAtual) {
        return res.redirect(
          '/consignados/sangrias?error=Sangria nao encontrada'
        );
      }

      const estabelecimentoId = parsePositiveIntegerId(
        estabelecimento_id,
        'Estabelecimento'
      );
      const dataSangria = parseSangriaDate(data_sangria);
      const quantidadeVendida = parseNonNegativeInteger(
        qtde_vendido,
        'Quantidade vendida'
      );
      const quantidadeAbastecida = parseNonNegativeInteger(
        abastecido,
        'Quantidade abastecida'
      );
      const valorApurado = parseNonNegativeDecimal(
        valor_apurado,
        'Valor apurado'
      );
      const tipoPagamento = parsePaymentType(tipo_pagamento);

      const produtoVinculado = await VisitasModel.findProdutoBySangria({
        sangria_id: id,
        assinante_id: usuario.assinante_id,
        produto: 'CONSIGNADOS'
      });

      if (Number(sangriaAtual.estabelecimento_id) !== Number(estabelecimentoId)) {
        throw new Error('Sangria de consignados nao pode trocar de estabelecimento para preservar o estoque do ponto.');
      }

      const hasLaterSangria = await consignadosModel.hasLaterSangria({
        estabelecimentoId: sangriaAtual.estabelecimento_id,
        assinanteId: usuario.assinante_id,
        dataSangria: sangriaAtual.data_sangria,
        id
      });

      if (hasLaterSangria) {
        throw new Error('Edite apenas a sangria mais recente deste ponto para nao quebrar o estoque futuro.');
      }

      const sangriaAnterior = await consignadosModel.getPreviousSangriaBeforeDate({
        estabelecimentoId,
        assinanteId: usuario.assinante_id,
        dataSangria,
        excludeId: id
      });
      const estoqueAnterior = sangriaAnterior
        ? parseInt(sangriaAnterior.qtde_deixada, 10)
        : 0;

      const qtdeDeixada =
        estoqueAnterior -
        quantidadeVendida +
        quantidadeAbastecida;

      if (qtdeDeixada < 0) {
        throw new Error('O estoque não pode ficar negativo.');
      }

      await consignadosModel.updateSangria({
        assinante_id: usuario.assinante_id,
        id,
        estabelecimento_id: estabelecimentoId,
        data_sangria: dataSangria,
        qtde_deixada: qtdeDeixada,
        abastecido: quantidadeAbastecida,
        estoque: estoqueAnterior,
        qtde_vendido: quantidadeVendida,
        valor_apurado: valorApurado,
        tipo_pagamento: tipoPagamento,
        observacoes: observacoes || ''
      });

      await recalculateConsolidatedRevenueForDates({
        produto: 'consignados',
        assinanteId: usuario.assinante_id,
        dates: [sangriaAtual.data_sangria, dataSangria]
      });

      res.redirect('/consignados/sangrias?success=Atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      res.redirect(
        `/consignados/sangrias?error=${encodeURIComponent(error.message)}`
      );
    }
  };

  deleteSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;
      const sangriaAtual = await consignadosModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      const result = await consignadosModel.deleteSangria(
        id,
        usuario.assinante_id
      );

      if (result.rowCount === 0) {
        const message = sangriaAtual
          ? 'Esta sangria nao pode ser excluida porque esta vinculada a uma visita.'
          : 'Sangria de consignados nao encontrada.';

        return res.status(409).json({
          success: false,
          message
        });
      }

      await recalculateConsolidatedRevenueForDates({
        produto: 'consignados',
        assinanteId: usuario.assinante_id,
        dates: [sangriaAtual?.data_sangria]
      });

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

      const sangriaAtualizada = await consignadosModel.updatePixConfirmado({
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

  viewSangria = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;

      const sangria = await consignadosModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/consignados/visualizarDadosConsignado', {
        sangria,
        usuario
      });
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      res.status(500).send('Erro ao visualizar.');
    }
  };

  getReceitaConsignados = async (req, res) => {
    const usuario = req.user;
    try {
      const receita = await consignadosModel.getMonthlyRevenue(
        usuario.assinante_id
      );

      res.render('pages/consignados/receitaConsignados', {
        receita,
        usuario
      });
    } catch (error) {
      console.error('Erro receita:', error);
      res.status(500).send('Erro ao carregar receita.');
    }
  };

  renderControleGeralConsignados = async (req, res) => {
    const usuario = req.user;
    try {
      const dados =
        await consignadosModel.getLatestSangriaForAllEstabelecimentos(
          usuario.assinante_id
        );

      res.render('pages/consignados/controleGeralConsignados', {
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
      const usuario = req.user;
      const estabelecimentoId = req.params.id;

      const result = await consignadosModel.getUltimaSangria(
        estabelecimentoId,
        usuario.assinante_id
      );

      if (result.length === 0) {
        return res.json({
          estoque: 0,
          data: null,
          hasHistorico: false
        });
      }

      res.json({
        estoque: result[0].qtde_deixada,
        data: result[0].data_sangria,
        hasHistorico: true
      });
    } catch (error) {
      console.error('Erro ao buscar última sangria:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  gerarRecibo = async (req, res) => {
    const usuario = req.user;

    try {
      const { id } = req.params;

      const sangria = await consignadosModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria de consignados não encontrada.');
      }

      const pdfBuffer = gerarReciboPdfBuffer({
        produto: 'Consignados',
        sangria,
        usuario
      });

      const filename = gerarNomeArquivoRecibo({
        produto: 'consignados',
        sangria
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar recibo de consignados:', error);
      return res.status(500).send('Erro ao gerar recibo de consignados.');
    }
  };
}

export default new ConsignadosController();
