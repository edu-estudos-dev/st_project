import peluciasModel from '../models/peluciasModel.js';
import RotasOperacionaisModel from '../models/rotasOperacionaisModel.js';
import VisitasModel from '../models/visitasModel.js';
import {
  gerarNomeArquivoRecibo,
  gerarReciboPdfBuffer
} from '../utils/reciboPdf.js';
class PeluciasController {
  addSangriaForm = async (req, res) => {
    const usuario = req.user || null;

    try {
      const estabelecimentos = await peluciasModel.getEstabelecimentos(
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

      res.render('pages/pelucias/cadastrarSangriaPelucia', {
        estabelecimentos,
        usuario,
        ultimaLeitura: '',
        ultimoEstoque: '',
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

  addSangria = async (req, res) => {
    const usuario = req.user;

    const {
      estabelecimento_id,
      data_sangria,
      leitura_atual,
      abastecido,
      valor_apurado,
      comissao,
      tipo_pagamento,
      observacoes,
      abertura_inicial,
      leitura_inicial,
      estoque_inicial,
      visita_id,
      rota_id,
      rota_ponto_id,
      origem,
      retorno_url,
      rota_retorno_url
    } = req.body;

    try {
      const isAberturaInicial = abertura_inicial === 'on';
      const hasHistorico = estabelecimento_id
        ? await peluciasModel.hasSangria(
            estabelecimento_id,
            usuario.assinante_id
          )
        : false;

      if (isAberturaInicial) {
        if (!estabelecimento_id || !data_sangria) {
          throw new Error('Estabelecimento e data são obrigatórios.');
        }

        if (hasHistorico) {
          throw new Error(
            'Este estabelecimento já possui histórico de pelúcias. Use o cadastro normal de visita.'
          );
        }

        if (
          leitura_inicial === undefined ||
          leitura_inicial === null ||
          String(leitura_inicial).trim() === ''
        ) {
          throw new Error(
            'Informe a leitura inicial antes de cadastrar a abertura de pelúcias.'
          );
        }

        if (
          estoque_inicial === undefined ||
          estoque_inicial === null ||
          String(estoque_inicial).trim() === ''
        ) {
          throw new Error(
            'Informe o abastecido inicial antes de cadastrar a abertura de pelúcias.'
          );
        }

        const leituraInicial = Number(leitura_inicial);
        const estoqueInicial = Number(estoque_inicial);

        if (Number.isNaN(leituraInicial) || leituraInicial < 0) {
          throw new Error('A leitura inicial deve ser um número válido.');
        }

        if (Number.isNaN(estoqueInicial) || estoqueInicial < 0) {
          throw new Error('O estoque inicial deve ser um número válido.');
        }

        await peluciasModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id,
          data_sangria,
          valor_apurado: 0,
          comissao: 0,
          valor_comerciante: 0,
          valor_liquido: 0,
          tipo_pagamento: 'especie',
          observacoes: `[ABERTURA INICIAL] ${
            observacoes || 'Ponto iniciado com leitura e estoque base.'
          }`.trim(),
          leitura_atual: leituraInicial,
          ultima_leitura: 0,
          abastecido: estoqueInicial,
          qtde_vendido: 0,
          estoque: estoqueInicial
        });

        return res.redirect(
          '/pelucias/sangrias?success=Abertura inicial de pelúcias cadastrada com sucesso'
        );
      }

      if (!hasHistorico) {
        throw new Error(
          'Este ponto ainda não possui registro inicial de pelúcias. Faça primeiro o cadastro inicial.'
        );
      }

      const ultimoRegistro = await peluciasModel.getUltimosDados(
        estabelecimento_id,
        usuario.assinante_id
      );

      const ultimaDataSangria = await peluciasModel.getUltimaDataSangria(
        estabelecimento_id,
        usuario.assinante_id
      );

      const leituraAnterior = Number(ultimoRegistro.ultima_leitura || 0);
      const leituraAtual = Number(leitura_atual || 0);
      const quantidadeAbastecida = Number(abastecido || 0);
      const valorApurado = Number(valor_apurado || 0);
      const percentualComissao = Number(comissao || 0);

      if (new Date(data_sangria) <= new Date(ultimaDataSangria.data_sangria)) {
        return res.redirect(
          '/pelucias/sangrias?error=A data do novo cadastro não pode ser anterior ou igual à data da última sangria cadastrada.'
        );
      }

      if (leituraAtual < leituraAnterior) {
        return res.redirect(
          '/pelucias/sangrias/add?error=A leitura atual não pode ser menor que a última leitura registrada.'
        );
      }

      const qtdeVendido = leituraAtual - leituraAnterior;
      const estoque =
        Number(ultimoRegistro.estoque || 0) -
        qtdeVendido +
        quantidadeAbastecida;

      const valorDaComissao = valorApurado * (percentualComissao / 100);
      const valorLiquido = valorApurado - valorDaComissao;

      const sangriaResult = await peluciasModel.createSangria({
        assinante_id: usuario.assinante_id,
        estabelecimento_id,
        data_sangria,
        leitura_atual: leituraAtual,
        ultima_leitura: leituraAnterior,
        abastecido: quantidadeAbastecida,
        qtde_vendido: qtdeVendido,
        valor_apurado: valorApurado,
        comissao: percentualComissao,
        valor_comerciante: valorDaComissao,
        valor_liquido: valorLiquido,
        tipo_pagamento,
        observacoes,
        estoque
      });

      const sangriaId = sangriaResult?.rows?.[0]?.id || null;

      const reciboUrl = sangriaId
        ? `/pelucias/sangrias/recibo/${sangriaId}`
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
          produto: 'PELUCIAS',
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
            finalizarError.message.includes(
              'Ainda existem produtos pendentes'
            )
          ) {
            const separador = retornoSeguro.includes('?') ? '&' : '?';

           return res.redirect(
              `${retornoSeguro}${separador}success=${encodeURIComponent(
                'Pelúcias registrada. Ainda existem produtos pendentes nesta visita.'
              )}&recibo_url=${encodeURIComponent(reciboUrl)}`
            );
          }

          throw finalizarError;
        }
      }

      return res.redirect(
        `/pelucias/sangrias?success=${encodeURIComponent(
          'Sangria adicionada com sucesso'
        )}&recibo_url=${encodeURIComponent(reciboUrl)}`
      );
    } catch (error) {
      console.error('Erro ao adicionar sangria:', error);

      return res.redirect(
        `/pelucias/sangrias?error=${encodeURIComponent(
          error.message || 'Erro ao adicionar sangria'
        )}`
      );
    }
  };

  index = async (req, res) => {
    const usuario = req.user;

    try {
      const sangrias = await peluciasModel.getSangrias(usuario.assinante_id);
      const { success, error } = req.query;

      res.render('pages/pelucias/tabelaPelucia', {
        sangrias,
        usuario,
        success,
        error
      });
    } catch (error) {
      console.error('Erro ao listar sangrias:', error);
      res.status(500).send('Erro ao listar sangrias.');
    }
  };

  editSangriaForm = async (req, res) => {
    const usuario = req.user;

    try {
      const id = req.params.id;

      const estabelecimentos = await peluciasModel.getEstabelecimentos(
        usuario.assinante_id
      );

      const sangria = await peluciasModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/pelucias/editarSangriaPelucia', {
        estabelecimentos,
        sangria,
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
        observacoes,
        leitura_atual,
        abastecido,
        qtde_vendido
      } = req.body;

      const valorDaComissao = Number(valor_apurado || 0) * (Number(comissao || 0) / 100);
      const valorLiquido = Number(valor_apurado || 0) - valorDaComissao;

      await peluciasModel.updateSangria({
        assinante_id: usuario.assinante_id,
        id,
        estabelecimento_id,
        data_sangria,
        valor_apurado,
        comissao: parseFloat(comissao),
        valor_comerciante: valorDaComissao,
        valor_liquido: valorLiquido,
        tipo_pagamento,
        observacoes,
        leitura_atual,
        abastecido,
        qtde_vendido: qtde_vendido ? Number(qtde_vendido) : null
      });

      res.redirect('/pelucias/sangrias?success=Sangria atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar sangria:', error);
      res.redirect('/pelucias/sangrias?error=Erro ao atualizar sangria');
    }
  };

  deleteSangria = async (req, res) => {
    try {
      const usuario = req.user;
      const id = req.params.id;

      await peluciasModel.deleteSangria(id, usuario.assinante_id);

      res.status(200).json({
        success: true,
        message: 'Sangria excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar sangria:', error);

      res.status(500).json({
        success: false,
        message: 'Erro ao excluir sangria'
      });
    }
  };

  viewSangria = async (req, res) => {
    const usuario = req.user;

    try {
      const id = req.params.id;

      const sangria = await peluciasModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria não encontrada.');
      }

      res.render('pages/pelucias/visualizarDadosPelucia', {
        sangria,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar os detalhes da sangria:', error);
      res.status(500).send('Erro ao carregar os detalhes da sangria.');
    }
  };

  getReceitaPelucias = async (req, res) => {
    const usuario = req.user;

    try {
      const receita = await peluciasModel.getMonthlyRevenue(
        usuario.assinante_id
      );

      res.render('pages/pelucias/receitaPelucia', {
        receita,
        usuario
      });
    } catch (error) {
      console.error('Erro ao obter receita de pelúcias:', error);

      res.status(500).json({
        message: 'Erro ao obter receita de pelúcias.'
      });
    }
  };

  renderControleGeralPelucias = async (req, res) => {
    const usuario = req.user;

    try {
      const dadosControleGeral =
        await peluciasModel.getLatestSangriaForAllEstabelecimentos(
          usuario.assinante_id
        );

      res.render('pages/pelucias/controleGeralPelucias', {
        estabelecimentos: dadosControleGeral,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar controle geral das pelúcias:', error);
      res.status(500).send('Erro ao carregar controle geral das pelúcias.');
    }
  };

  controleGeral = async (req, res) => {
    const usuario = req.user || null;

    try {
      const estabelecimentos = await peluciasModel.getAllSangrias(
        usuario.assinante_id
      );

      res.render('pages/pelucias/controleGeralPelucias', {
        estabelecimentos,
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar o controle geral das pelúcias:', error);
      res.status(500).send('Erro ao carregar o controle geral das pelúcias.');
    }
  };

    getUltimosDados = async (req, res) => {
    const { estabelecimentoId } = req.params;

    try {
      const dados = await peluciasModel.getUltimosDados(
        estabelecimentoId,
        req.user.assinante_id
      );

      res.json({
        ultima_leitura: Number(dados.ultima_leitura || 0),
        estoque: Number(dados.estoque || 0),
        hasHistorico: await peluciasModel.hasSangria(
          estabelecimentoId,
          req.user.assinante_id
        )
      });
    } catch (error) {
      console.error('Erro ao buscar os últimos dados:', error);
      res.status(500).json({ error: 'Erro ao buscar os últimos dados' });
    }
  };

  gerarRecibo = async (req, res) => {
    const usuario = req.user;

    try {
      const { id } = req.params;

      const sangria = await peluciasModel.getSangriaById(
        id,
        usuario.assinante_id
      );

      if (!sangria) {
        return res.status(404).send('Sangria de pelúcias não encontrada.');
      }

      const pdfBuffer = gerarReciboPdfBuffer({
        produto: 'Pelúcias',
        sangria,
        usuario
      });

      const filename = gerarNomeArquivoRecibo({
        produto: 'pelucias',
        sangria
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Erro ao gerar recibo de pelúcias:', error);
      return res.status(500).send('Erro ao gerar recibo de pelúcias.');
    }
  };
}

export default new PeluciasController();