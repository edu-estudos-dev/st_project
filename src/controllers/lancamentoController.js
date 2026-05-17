import LancamentoModel from '../models/lancamentoModel.js';
import { addMonths } from 'date-fns';
import { hasProduto } from '../utilities/produtoUtils.js';
import { buildPagination, parsePagination } from '../utilities/pagination.js';
import {
  normalizeSearchTerm,
  SearchValidationError
} from '../utilities/searchValidation.js';

const TIPOS_POR_MOVIMENTO = {
  Entrada: new Set(['receita_dos_pontos', 'incremento_de_capital']),
  Saida: new Set(['compra', 'extra', 'pro-labore', 'gastos_recorrentes', 'bonus'])
};

const FORMAS_PAGAMENTO = {
  Entrada: new Set(['pix', 'especie']),
  Saida: new Set(['boleto', 'credito', 'pix', 'especie'])
};

const FORMAS_PAGAMENTO_PARCELAVEIS = new Set(['boleto', 'credito']);

const MENSAGEM_MOVIMENTACAO_IMUTAVEL =
  'A movimentação original não pode ser alterada de entrada para saída ou vice-versa. Se o tipo estiver errado, exclua este lançamento e cadastre um novo.';

const MENSAGEM_RECEITA_CONSOLIDADA_IMUTAVEL =
  'Esta receita foi gerada automaticamente pelas sangrias. Para alterar este valor, edite ou exclua a sangria de origem; o sistema recalcula a receita consolidada.';

const exigeProdutoPorMovimento = (entradaSaida) => entradaSaida === 'Saida';

const normalizeLancamentoType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const isSystemConsolidatedRevenue = (lancamento) =>
  lancamento?.entrada_saida === 'Entrada'
  && normalizeLancamentoType(lancamento?.tipo_de_lancamento) === 'receita_dos_pontos'
  && String(lancamento?.usuario || '').trim().toLowerCase() === 'sistema';

const normalizaProdutoPorMovimento = ({ entrada_saida, produto }) => {
  if (!exigeProdutoPorMovimento(entrada_saida)) {
    return null;
  }

  return produto;
};

const permiteParcelamentoComVencimento = ({ entrada_saida, forma_de_pagamento }) =>
  entrada_saida === 'Saida' && FORMAS_PAGAMENTO_PARCELAVEIS.has(forma_de_pagamento);

const exigeVencimentoParcelado = ({ entrada_saida, forma_de_pagamento, qtde_de_parcelas }) =>
  permiteParcelamentoComVencimento({ entrada_saida, forma_de_pagamento })
  && Number(qtde_de_parcelas || 0) > 1;

const ehLancamentoParceladoComVencimento = (lancamento) =>
  lancamento?.entrada_saida === 'Saida'
  && FORMAS_PAGAMENTO_PARCELAVEIS.has(String(lancamento?.forma_de_pagamento || '').toLowerCase())
  && Number(lancamento?.qtde_de_parcelas || 0) > 1;

const normalizeDateOnly = (value, fieldLabel) => {
  const raw = String(value || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  const parsed = new Date(`${raw}T00:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== raw
  ) {
    throw new Error(`${fieldLabel} invalida.`);
  }

  return raw;
};

const validateLancamentoPayload = ({
  payload,
  usuario,
  allowCurrentProduct = null
}) => {
  const {
    entrada_saida,
    tipo_de_lancamento,
    produto,
    forma_de_pagamento,
    qtde_de_parcelas,
    data,
    valor
  } = payload;

  const dataNormalizada = normalizeDateOnly(data, 'Data');

  if (!['Entrada', 'Saida'].includes(entrada_saida)) {
    throw new Error('Entrada ou saída inválida.');
  }

  if (!TIPOS_POR_MOVIMENTO[entrada_saida]?.has(tipo_de_lancamento)) {
    throw new Error('Tipo de lançamento não corresponde à movimentação escolhida.');
  }

  if (!FORMAS_PAGAMENTO[entrada_saida]?.has(forma_de_pagamento)) {
    if (entrada_saida === 'Entrada') {
      throw new Error('Para entradas, use apenas Pix ou Espécie como forma de pagamento.');
    }

    throw new Error('Forma de pagamento inválida.');
  }

  const parcelas = Number(qtde_de_parcelas);

  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120) {
    throw new Error('Quantidade de parcelas inválida.');
  }

  const podeParcelarComVencimento = permiteParcelamentoComVencimento({
    entrada_saida,
    forma_de_pagamento
  });

  if (!podeParcelarComVencimento && parcelas > 1) {
    throw new Error('Parcelamento só está disponível para saídas em boleto ou crédito.');
  }

  const parcelasNormalizadas = podeParcelarComVencimento ? parcelas : 1;

  const valorNumerico = Number(valor);
  if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  const produtoNormalizado = normalizaProdutoPorMovimento({
    entrada_saida,
    produto
  });

  if (exigeProdutoPorMovimento(entrada_saida)) {
    if (!produtoNormalizado) {
      throw new Error('Informe o produto para lançamentos de saída.');
    }

    const produtoLiberado = hasProduto(
      usuario?.assinatura?.produtos_habilitados,
      produtoNormalizado
    );

    if (!produtoLiberado && produtoNormalizado !== allowCurrentProduct) {
      throw new Error('Produto nao liberado para este assinante.');
    }
  }

  return {
    parcelas: parcelasNormalizadas,
    dataNormalizada,
    valorNumerico,
    produtoNormalizado,
    vencimentoObrigatorio: exigeVencimentoParcelado({
      entrada_saida,
      forma_de_pagamento,
      qtde_de_parcelas: parcelasNormalizadas
    })
  };
};

class LancamentoController {
  index = async (req, res) => {
    try {
      const usuario = req.user;
      const tipoFiltro = (req.query.tipo || 'todos').toLowerCase();
      const pageOptions = parsePagination(req.query);
      const { rows: lancamentos, total } = await LancamentoModel.findPage(
        usuario.assinante_id,
        { ...pageOptions, tipo: tipoFiltro }
      );

      return res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Lançamentos Cadastrados',
        lancamentos,
        pageTitle: 'Lançamentos Cadastrados',
        usuario,
        tipoFiltro,
        success: req.query.success,
        error: req.query.error,
        pagination: buildPagination({
          ...pageOptions,
          totalItems: total,
          basePath: '/lancamentos',
          query: req.query
        })
      });
    } catch (error) {
      if (error instanceof SearchValidationError) {
        return res.status(400).render('pages/lancamentos/tabelaLancamento', {
          title: 'Resultados da Pesquisa - Lancamentos',
          lancamentos: [],
          search: true,
          usuario,
          tipoFiltro: 'todos',
          error: error.message
        });
      }

      console.error('Erro ao listar lançamentos:', error);
      return res.status(500).send('Erro ao listar lançamentos.');
    }
  };

  vencimentos = async (req, res) => {
    const usuario = req.user;

    try {
      const { proximos, atrasados } = await LancamentoModel.getNotificationAlerts(
        5,
        usuario.assinante_id
      );

      return res.render('pages/lancamentos/vencimentos', {
        title: 'Vencimentos',
        usuario,
        proximos,
        atrasados,
        success: req.query.success,
        error: req.query.error,
        tipoFiltro: 'todos'
      });
    } catch (error) {
      console.error('Erro ao carregar vencimentos:', error);
      return res.status(500).send('Erro ao carregar vencimentos.');
    }
  };

  addLancamentoForm = (req, res) => {
    const usuario = req.user;

    return res.render('pages/lancamentos/cadastrarLancamentos', {
      title: 'Adicionar Lançamento',
      usuario,
      success: undefined,
      error: undefined
    });
  };

  addLancamento = async (req, res) => {
    const usuario = req.user;
    const {
      entrada_saida,
      data,
      tipo_de_lancamento,
      produto,
      forma_de_pagamento,
      vencimento,
      qtde_de_parcelas,
      valor,
      descricao
    } = req.body;

    const produtoObrigatorio = exigeProdutoPorMovimento(entrada_saida);

    if (
      !entrada_saida ||
      !data ||
      !tipo_de_lancamento ||
      (produtoObrigatorio && !produto) ||
      !forma_de_pagamento ||
      qtde_de_parcelas === undefined ||
      !valor ||
      !descricao ||
      !usuario
    ) {
      return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
    }

    try {
      const {
        parcelas,
        dataNormalizada,
        valorNumerico,
        produtoNormalizado,
        vencimentoObrigatorio
      } = validateLancamentoPayload({
        payload: req.body,
        usuario
      });

      if (vencimentoObrigatorio && !vencimento) {
        return res.status(400).send('Informe a data de vencimento da primeira parcela.');
      }

      const vencimentoNormalizado = vencimentoObrigatorio
        ? normalizeDateOnly(vencimento, 'Data de vencimento')
        : null;

      if (vencimentoObrigatorio) {
        const valorParcela = valorNumerico / parcelas;
        const baseVencimento = new Date(`${vencimentoNormalizado}T00:00:00`);

        for (let i = 0; i < parcelas; i++) {
          const vencimentoParcela = addMonths(baseVencimento, i).toISOString().split('T')[0];

          await LancamentoModel.create({
            assinante_id: usuario.assinante_id,
            entrada_saida,
            data: dataNormalizada,
            tipo_de_lancamento,
            produto: produtoNormalizado,
            forma_de_pagamento,
            vencimento: vencimentoParcela,
            qtde_de_parcelas: parcelas,
            valor: valorParcela,
            descricao: `${descricao} - Parcela ${i + 1}/${parcelas}`,
            usuario
          });
        }
      } else {
        await LancamentoModel.create({
          assinante_id: usuario.assinante_id,
          entrada_saida,
          data: dataNormalizada,
          tipo_de_lancamento,
          produto: produtoNormalizado,
          forma_de_pagamento,
          vencimento: null,
          qtde_de_parcelas: parcelas,
          valor: valorNumerico,
          descricao,
          usuario
        });
      }

      return res.redirect('/lancamentos?success=Lançamento cadastrado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);

      return res.status(500).render('pages/lancamentos/cadastrarLancamentos', {
        title: 'Adicionar Lançamento',
        success: null,
        usuario,
        error: error.message || 'Erro ao cadastrar lançamento. Por favor, tente novamente.'
      });
    }
  };

  editLancamentoForm = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;

    try {
      const lancamento = await LancamentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!lancamento) {
        return res.status(404).send('Lançamento não encontrado.');
      }

      if (isSystemConsolidatedRevenue(lancamento)) {
        return res.redirect(
          `/lancamentos?error=${encodeURIComponent(MENSAGEM_RECEITA_CONSOLIDADA_IMUTAVEL)}`
        );
      }

      return res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento,
        success: undefined,
        error: undefined,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      return res.status(500).send('Erro ao buscar lançamento.');
    }
  };

  editLancamento = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;
    const {
      entrada_saida,
      data,
      tipo_de_lancamento,
      produto,
      forma_de_pagamento,
      vencimento,
      qtde_de_parcelas,
      valor,
      descricao
    } = req.body;

    const produtoObrigatorio = exigeProdutoPorMovimento(entrada_saida);

    if (
      !entrada_saida ||
      !data ||
      !tipo_de_lancamento ||
      (produtoObrigatorio && !produto) ||
      !forma_de_pagamento ||
      qtde_de_parcelas === undefined ||
      !valor ||
      !descricao
    ) {
      return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
    }

    try {
      const lancamentoAtual = await LancamentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!lancamentoAtual) {
        return res.status(404).send('Lançamento não encontrado.');
      }

      if (isSystemConsolidatedRevenue(lancamentoAtual)) {
        return res.status(409).render('pages/lancamentos/editarLancamento', {
          title: 'Editar Lançamento',
          lancamento: lancamentoAtual,
          success: null,
          usuario,
          error: MENSAGEM_RECEITA_CONSOLIDADA_IMUTAVEL
        });
      }

      if (entrada_saida !== lancamentoAtual.entrada_saida) {
        return res.status(400).render('pages/lancamentos/editarLancamento', {
          title: 'Editar Lançamento',
          lancamento: lancamentoAtual,
          success: null,
          usuario,
          error: MENSAGEM_MOVIMENTACAO_IMUTAVEL
        });
      }

      const {
        parcelas,
        dataNormalizada,
        valorNumerico,
        produtoNormalizado,
        vencimentoObrigatorio
      } = validateLancamentoPayload({
        payload: req.body,
        usuario,
        allowCurrentProduct: lancamentoAtual.produto
      });

      if (vencimentoObrigatorio && !vencimento) {
        return res.status(400).send('Informe a data de vencimento da primeira parcela.');
      }

      const vencimentoNormalizado = vencimentoObrigatorio
        ? normalizeDateOnly(vencimento, 'Data de vencimento')
        : null;

      await LancamentoModel.update(id, usuario.assinante_id, {
        entrada_saida,
        data: dataNormalizada,
        tipo_de_lancamento,
        produto: produtoNormalizado,
        forma_de_pagamento,
        vencimento: vencimentoNormalizado,
        qtde_de_parcelas: parcelas,
        valor: valorNumerico,
        descricao
      });

      return res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento: {
          id,
          entrada_saida,
          data: dataNormalizada,
          tipo_de_lancamento,
          produto: produtoNormalizado,
          forma_de_pagamento,
          vencimento: vencimentoNormalizado,
          qtde_de_parcelas: parcelas,
          valor: valorNumerico,
          descricao
        },
        success: 'Lançamento atualizado com sucesso!',
        error: null,
        usuario
      });
    } catch (error) {
      console.error('Erro ao editar lançamento:', error);

      return res.status(500).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento: req.body,
        success: null,
        usuario,
        error: error.message || 'Erro ao editar lançamento. Por favor, tente novamente.'
      });
    }
  };

  deleteLancamento = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;
    const acceptsJson = req.xhr
      || req.get('x-requested-with') === 'XMLHttpRequest'
      || req.get('accept')?.includes('application/json');

    try {
      const lancamentoAtual = await LancamentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!lancamentoAtual) {
        const message = 'LanÃ§amento nÃ£o encontrado.';

        if (acceptsJson) {
          return res.status(404).json({
            success: false,
            message
          });
        }

        return res.redirect(`/lancamentos?error=${encodeURIComponent(message)}`);
      }

      if (isSystemConsolidatedRevenue(lancamentoAtual)) {
        if (acceptsJson) {
          return res.status(409).json({
            success: false,
            message: MENSAGEM_RECEITA_CONSOLIDADA_IMUTAVEL
          });
        }

        return res.redirect(
          `/lancamentos?error=${encodeURIComponent(MENSAGEM_RECEITA_CONSOLIDADA_IMUTAVEL)}`
        );
      }

      await LancamentoModel.delete(id, usuario.assinante_id);

      if (acceptsJson) {
        return res.status(200).json({
          success: true,
          message: 'Lançamento excluído com sucesso.'
        });
      }

      return res.redirect('/lancamentos?success=Lançamento excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);

      if (acceptsJson) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao excluir lançamento.'
        });
      }

      return res.status(500).send('Erro ao excluir lançamento.');
    }
  };

  markAsPaid = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;

    try {
      const lancamento = await LancamentoModel.markAsPaid(
        id,
        usuario.assinante_id
      );

      if (!lancamento) {
        return res.redirect('/lancamentos/vencimentos?error=O vencimento selecionado não pode ser marcado como pago.');
      }

      return res.redirect('/lancamentos/vencimentos?success=Vencimento marcado como pago com sucesso.');
    } catch (error) {
      console.error('Erro ao marcar vencimento como pago:', error);
      return res.redirect('/lancamentos/vencimentos?error=Erro ao marcar vencimento como pago.');
    }
  };

  viewLancamento = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;

    try {
      const lancamento = await LancamentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!lancamento) {
        return res.status(404).send('Lançamento não encontrado.');
      }

      const valorDaParcela = ehLancamentoParceladoComVencimento(lancamento)
        ? Number(lancamento.valor || 0)
        : null;

      return res.status(200).render('pages/lancamentos/visualizarLancamento', {
        title: 'Visualizar Lançamento',
        lancamento,
        success: undefined,
        error: undefined,
        valor_da_parcela: valorDaParcela,
        ultima_edicao: lancamento.ultima_edicao,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      return res.status(500).send('Erro ao buscar lançamento.');
    }
  };

  search = async (req, res) => {
    const usuario = req.user;

    let termo;
    try {
      termo = normalizeSearchTerm(req.body?.termo);
    } catch (error) {
      return res.status(400).render('pages/lancamentos/tabelaLancamento', {
        title: 'Resultados da Pesquisa - Lancamentos',
        lancamentos: [],
        search: true,
        usuario,
        tipoFiltro: 'todos',
        error: error.message
      });
    }

    try {
      const lancamentos = await LancamentoModel.search(
        termo,
        usuario.assinante_id
      );

      return res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Resultados da Pesquisa - Lançamentos',
        lancamentos,
        search: true,
        usuario,
        tipoFiltro: 'todos'
      });
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      return res.status(500).send('Erro ao buscar lançamentos.');
    }
  };
}

export default new LancamentoController();
