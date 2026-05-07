import LancamentoModel from '../models/lancamentoModel.js';
import { addMonths } from 'date-fns';
import { hasProduto } from '../utilities/produtoUtils.js';

const isParcelado = ({ entrada_saida, qtde_de_parcelas }) =>
  entrada_saida === 'Saida' && Number(qtde_de_parcelas || 0) > 1;

const TIPOS_POR_MOVIMENTO = {
  Entrada: new Set(['receita_dos_pontos', 'incremento_de_capital']),
  Saida: new Set(['compra', 'extra', 'pro-labore', 'gastos_recorrentes', 'bonus'])
};

const FORMAS_PAGAMENTO = new Set(['boleto', 'credito', 'pix', 'especie']);

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
    valor
  } = payload;

  if (!['Entrada', 'Saida'].includes(entrada_saida)) {
    throw new Error('Entrada ou saida invalida.');
  }

  if (!TIPOS_POR_MOVIMENTO[entrada_saida]?.has(tipo_de_lancamento)) {
    throw new Error('Tipo de lancamento nao corresponde a entrada ou saida.');
  }

  if (!FORMAS_PAGAMENTO.has(forma_de_pagamento)) {
    throw new Error('Forma de pagamento invalida.');
  }

  const parcelas = Number(qtde_de_parcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120) {
    throw new Error('Quantidade de parcelas invalida.');
  }

  const valorNumerico = Number(valor);
  if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  const produtoLiberado = hasProduto(
    usuario?.assinatura?.produtos_habilitados,
    produto
  );

  if (!produtoLiberado && produto !== allowCurrentProduct) {
    throw new Error('Produto nao liberado para este assinante.');
  }

  return {
    parcelas,
    valorNumerico
  };
};

class LancamentoController {
  index = async (req, res) => {
    try {
      const usuario = req.user;
      const tipoFiltro = (req.query.tipo || 'todos').toLowerCase();
      let lancamentos = await LancamentoModel.findAll(usuario.assinante_id);

      if (tipoFiltro === 'entrada') {
        lancamentos = lancamentos.filter((item) => item.entrada_saida === 'Entrada');
      } else if (tipoFiltro === 'saida') {
        lancamentos = lancamentos.filter((item) => item.entrada_saida === 'Saida');
      }

      res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Lançamentos Cadastrados',
        lancamentos,
        pageTitle: 'Lançamentos Cadastrados',
        usuario,
        tipoFiltro
      });
    } catch (error) {
      console.error('Erro ao listar lançamentos:', error);
      res.status(500).send('Erro ao listar lançamentos.');
    }
  };

  vencimentos = async (req, res) => {
    const usuario = req.user;

    try {
      const { proximos, atrasados } = await LancamentoModel.getNotificationAlerts(
        5,
        usuario.assinante_id
      );

      res.render('pages/lancamentos/vencimentos', {
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
      res.status(500).send('Erro ao carregar vencimentos.');
    }
  };

  addLancamentoForm = (req, res) => {
    const usuario = req.user;
    res.render('pages/lancamentos/cadastrarLancamentos', {
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

    if (
      !entrada_saida ||
      !data ||
      !tipo_de_lancamento ||
      !produto ||
      !forma_de_pagamento ||
      qtde_de_parcelas === undefined ||
      !valor ||
      !descricao ||
      !usuario
    ) {
      return res.status(400).send('Todos os campos são obrigatórios.');
    }

    if (isParcelado({ entrada_saida, qtde_de_parcelas }) && !vencimento) {
      return res.status(400).send('Informe a data de vencimento da primeira parcela.');
    }

    try {
      const { parcelas, valorNumerico } = validateLancamentoPayload({
        payload: req.body,
        usuario
      });

      if (isParcelado({ entrada_saida, qtde_de_parcelas })) {
        const valorParcela = valorNumerico / parcelas;
        const baseVencimento = new Date(`${vencimento}T00:00:00`);

        for (let i = 0; i < parcelas; i++) {
          const vencimentoParcela = addMonths(baseVencimento, i).toISOString().split('T')[0];
          await LancamentoModel.create({
            assinante_id: usuario.assinante_id,
            entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
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
          data,
          tipo_de_lancamento,
          produto,
          forma_de_pagamento,     
          vencimento: vencimento || null,
          qtde_de_parcelas: parcelas,
          valor: valorNumerico,
          descricao,
          usuario
        });
      }

      res.redirect('/lancamentos?success=Lançamento cadastrado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar lançamento:', error);
      res.status(500).render('pages/lancamentos/cadastrarLancamentos', {
        title: 'Adicionar Lançamento',
        success: null,
        usuario,
        error: 'Erro ao cadastrar lançamento. Por favor, tente novamente.'
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

      res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento,
        success: undefined,
        error: undefined,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      res.status(500).send('Erro ao buscar lançamento.');
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

    if (
      !entrada_saida ||
      !data ||
      !tipo_de_lancamento ||
      !produto ||
      !forma_de_pagamento ||
      qtde_de_parcelas === undefined ||
      !valor ||
      !descricao
    ) {
      return res.status(400).send('Todos os campos são obrigatórios.');
    }

    if (isParcelado({ entrada_saida, qtde_de_parcelas }) && !vencimento) {
      return res.status(400).send('Informe a data de vencimento da primeira parcela.');
    }

    try {
      const lancamentoAtual = await LancamentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!lancamentoAtual) {
        return res.status(404).send('LanÃ§amento nÃ£o encontrado.');
      }

      const { parcelas, valorNumerico } = validateLancamentoPayload({
        payload: req.body,
        usuario,
        allowCurrentProduct: lancamentoAtual.produto
      });

      await LancamentoModel.update(id, usuario.assinante_id, {
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        vencimento: vencimento || null,
        qtde_de_parcelas: parcelas,
        valor: valorNumerico,
        descricao
      });

      res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento: {
          id,
          entrada_saida,
          data,
          tipo_de_lancamento,
          produto,
          forma_de_pagamento,
          vencimento,
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
      res.status(500).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lançamento',
        lancamento: req.body,
        success: null,
        usuario,
        error: 'Erro ao editar lançamento. Por favor, tente novamente.'
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
      await LancamentoModel.delete(id, usuario.assinante_id);

      if (acceptsJson) {
        return res.status(200).json({
          success: true,
          message: 'Lançamento excluído com sucesso.'
        });
      }

      return res.redirect('/lancamentos?success=Lançamento excluído com sucesso');
    } catch (error) {
      console.error('Erro ao deletar lançamento:', error);

      if (acceptsJson) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar lançamento.'
        });
      }

      return res.status(500).send('Erro ao deletar lançamento.');
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
        return res.redirect('/lancamentos/vencimentos?error=O boleto selecionado nao pode ser marcado como pago.');
      }

      return res.redirect('/lancamentos/vencimentos?success=Boleto marcado como pago com sucesso.');
    } catch (error) {
      console.error('Erro ao marcar lancamento como pago:', error);
      return res.redirect('/lancamentos/vencimentos?error=Erro ao marcar boleto como pago.');
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
        return res.status(404).send('Lancamento nao encontrado.');
      }

      const valorDaParcela =
        Number(lancamento.qtde_de_parcelas || 0) > 1
          ? Number(lancamento.valor || 0)
          : null;

      res.status(200).render('pages/lancamentos/visualizarLancamento', {
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
      res.status(500).send('Erro ao buscar lançamento.');
    }
  };

  search = async (req, res) => {
    const { termo } = req.body;
    const usuario = req.user;

    try {
      const lancamentos = await LancamentoModel.search(
        termo,
        usuario.assinante_id
      );
      res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Resultados da Pesquisa - Lançamentos',
        lancamentos,
        search: true,
        usuario,
        tipoFiltro: 'todos'
      });
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      res.status(500).send('Erro ao buscar lançamentos.');
    }
  };
}

export default new LancamentoController();
