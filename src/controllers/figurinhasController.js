import figurinhasModel from '../models/figurinhasModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';
import {
  gerarNomeArquivoRecibo,
  gerarReciboPdfBuffer
} from '../utils/reciboPdf.js';

class FigurinhasController {
  addSangriaForm = async (req, res) => {
    const usuario = req.user || null;

    try {
      const estabelecimentos = await figurinhasModel.getEstabelecimentos(
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

      res.render('pages/figurinhas/cadastrarSangriaFigurinha', {
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

      const ultimaSangria = await figurinhasModel.getUltimaSangria(
        estabelecimento_id,
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

        const quantidadeInicial = parseInt(quantidade_inicial || 0, 10);

        if (Number.isNaN(quantidadeInicial) || quantidadeInicial < 0) {
          throw new Error('A quantidade inicial deve ser um número válido.');
        }

        await figurinhasModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id,
          data_sangria,
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
          '/figurinhas/sangrias?success=Abertura inicial de consignados cadastrada com sucesso'
        );
      }

      if (!hasHistorico) {
        throw new Error(
          'Este ponto ainda não possui registro inicial de consignados. Faça primeiro o cadastro inicial.'
        );
      }

      const estoqueAnterior = parseInt(ultimaSangria[0].qtde_deixada, 10);

      const quantidadeVendida = parseInt(qtde_vendido || 0, 10);
      const quantidadeAbastecida = parseInt(abastecido || 0, 10);
      const valorApurado = parseFloat(valor_apurado || 0);

      const qtdeDeixada =
        estoqueAnterior - quantidadeVendida + quantidadeAbastecida;

      if (qtdeDeixada < 0) {
        throw new Error('O estoque não pode ficar negativo.');
      }

      const sangriaResult = await figurinhasModel.createSangria({
        assinante_id: usuario.assinante_id,
        estabelecimento_id,
        data_sangria,
        qtde_deixada: qtdeDeixada,
        abastecido: quantidadeAbastecida,
        estoque: estoqueAnterior,
        qtde_vendido: quantidadeVendida,
        valor_apurado: valorApurado,
        tipo_pagamento,
        observacoes: observacoes || ''
      });

      const sangriaId = sangriaResult?.rows?.[0]?.id || null;

      const reciboUrl = sangriaId
        ? `/figurinhas/sangrias/recibo/${sangriaId}`
        : '';

      if (origem === 'rota' && visita_id && rota_ponto_id) {
        const retornoSeguro =
          retorno_url && String(retorno_url).startsWith('/rotas')
            ? String(retorno_url)
            : '/rotas';

        const rotaRetornoSeguro =
          rota_retorno_url && String(rota_retorno_url).startsWith('/rotas')
            ? String(rota_retorno_url)
            : retornoSeguro;

        await VisitasModel.marcarProdutoRegistrado({
          visita_id,
          assinante_id: usuario.assinante_id,
          produto: 'FIGURINHAS',
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

          const separador = rotaRetornoSeguro.includes('?') ? '&' : '?';

         return res.redirect(
            `${rotaRetornoSeguro}${separador}rota_ponto_finalizado=${encodeURIComponent(
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
            const separador = retornoSeguro.includes('?') ? '&' : '?';

            return res.redirect(
              `${retornoSeguro}${separador}success=${encodeURIComponent(
                'Consignados registrado. Ainda existem produtos pendentes nesta visita.'
              )}&recibo_url=${encodeURIComponent(reciboUrl)}`
            );
          }

          throw finalizarError;
        }
      }

     return res.redirect(
        `/figurinhas/sangrias?success=${encodeURIComponent(
          'Sangria adicionada com sucesso'
        )}&recibo_url=${encodeURIComponent(reciboUrl)}`
      );
    } catch (error) {
      console.error('Erro ao adicionar sangria de consignados:', error);
      return res.redirect(
        `/figurinhas/sangrias?error=${encodeURIComponent(error.message)}`
      );
    }
  };

  index = async (req, res) => {
    const usuario = req.user;
    try {
      const sangrias = await figurinhasModel.getSangrias(usuario.assinante_id);
      const { success, error } = req.query;

      res.render('pages/figurinhas/tabelaFigurinha', {
        sangrias,
        usuario,
        success,
        error
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

      const estabelecimentos = await figurinhasModel.getEstabelecimentos(
        usuario.assinante_id
      );
      const sangria = await figurinhasModel.getSangriaById(
        id,
        usuario.assinante_id
      );

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

      const ultimaSangria = await figurinhasModel.getUltimaSangria(
        estabelecimento_id,
        usuario.assinante_id
      );
      const estoqueAnterior =
        ultimaSangria.length > 0
          ? parseInt(ultimaSangria[0].qtde_deixada, 10)
          : 0;

      const qtdeDeixada =
        estoqueAnterior -
        parseInt(qtde_vendido || 0, 10) +
        parseInt(abastecido || 0, 10);

      if (qtdeDeixada < 0) {
        throw new Error('O estoque não pode ficar negativo.');
      }

      await figurinhasModel.updateSangria({
        assinante_id: usuario.assinante_id,
        id,
        estabelecimento_id,
        data_sangria,
        qtde_deixada: qtdeDeixada,
        abastecido: parseInt(abastecido || 0, 10),
        estoque: estoqueAnterior,
        qtde_vendido: parseInt(qtde_vendido || 0, 10),
        valor_apurado: parseFloat(valor_apurado || 0),
        tipo_pagamento,
        observacoes: observacoes || ''
      });

      res.redirect('/figurinhas/sangrias?success=Atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      res.redirect(
        `/figurinhas/sangrias?error=${encodeURIComponent(error.message)}`
      );
    }
  };

  deleteSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;

      await figurinhasModel.deleteSangria(id, usuario.assinante_id);

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

      const sangria = await figurinhasModel.getSangriaById(
        id,
        usuario.assinante_id
      );

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
      const receita = await figurinhasModel.getMonthlyRevenue(
        usuario.assinante_id
      );

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
        await figurinhasModel.getLatestSangriaForAllEstabelecimentos(
          usuario.assinante_id
        );

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
      const usuario = req.user;
      const estabelecimentoId = req.params.id;

      const result = await figurinhasModel.getUltimaSangria(
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

      const sangria = await figurinhasModel.getSangriaById(
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


export default new FigurinhasController();
