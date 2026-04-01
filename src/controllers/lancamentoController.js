import LancamentoModel from '../models/lancamentoModel.js';
import { addMonths } from 'date-fns';

class LancamentoController {
  index = async (req, res) => {
    try {
      const usuario = req.user;
      const lancamentos = await LancamentoModel.findAll();
      res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Lançamentos Cadastrados',
        lancamentos,
        pageTitle: 'Lançamentos Cadastrados',
        usuario
      });
    } catch (error) {
      console.error('Erro ao listar lancamentos:', error);
      res.status(500).send('Erro ao listar lancamentos.');
    }
  };

  updateVencimento = async (req, res) => {
    const { id } = req.params;
    const { vencimento } = req.body;
    try {
      await LancamentoModel.updateVencimento(id, vencimento);
      res.redirect('/lancamentos?success=Vencimento atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar vencimento:', error);
      res.redirect('/lancamentos?error=Erro ao atualizar vencimento');
    }
  };

  addLancamentoForm = (req, res) => {
    const usuario = req.user;
    res.render('pages/lancamentos/cadastrarLancamentos', {
      title: 'Adicionar Lancamento',
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
      return res.status(400).send('Todos os campos sao obrigatorios.');
    }

    try {
      if (entrada_saida === 'Saida' && qtde_de_parcelas > 1) {
        const valorParcela = valor / qtde_de_parcelas;
        for (let i = 0; i < qtde_de_parcelas; i++) {
          const dataParcela = addMonths(new Date(data), i);
          await LancamentoModel.create({
            entrada_saida,
            data: dataParcela,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            qtde_de_parcelas: 1,
            valor: valorParcela,
            descricao: `${descricao} - Parcela ${i + 1}/${qtde_de_parcelas}`,
            usuario
          });
        }
      } else {
        await LancamentoModel.create({
          entrada_saida,
          data,
          tipo_de_lancamento,
          produto,
          forma_de_pagamento,
          qtde_de_parcelas,
          valor,
          descricao,
          usuario
        });
      }
      res.redirect('/lancamentos?success=Lancamento cadastrado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar lancamento:', error);
      res.status(500).render('pages/lancamentos/cadastrarLancamentos', {
        title: 'Adicionar Lancamento',
        success: null,
        usuario,
        error: 'Erro ao cadastrar lancamento. Por favor, tente novamente.'
      });
    }
  };

  editLancamentoForm = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;
    try {
      const lancamento = await LancamentoModel.findById(id);
      if (!lancamento) {
        return res.status(404).send('Lancamento nao encontrado.');
      }
      res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lancamento',
        lancamento,
        success: undefined,
        error: undefined,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lancamento:', error);
      res.status(500).send('Erro ao buscar lancamento.');
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
      return res.status(400).send('Todos os campos sao obrigatorios.');
    }

    try {
      await LancamentoModel.update(id, {
        entrada_saida,
        data,
        tipo_de_lancamento,
        produto,
        forma_de_pagamento,
        qtde_de_parcelas,
        valor,
        descricao
      });

      res.status(200).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lancamento',
        lancamento: {
          id,
          entrada_saida,
          data,
          tipo_de_lancamento,
          produto,
          forma_de_pagamento,
          qtde_de_parcelas,
          valor,
          descricao
        },
        success: 'Lancamento atualizado com sucesso!',
        error: null,
        usuario
      });
    } catch (error) {
      console.error('Erro ao editar lancamento:', error);
      res.status(500).render('pages/lancamentos/editarLancamento', {
        title: 'Editar Lancamento',
        lancamento: req.body,
        success: null,
        usuario,
        error: 'Erro ao editar lancamento. Por favor, tente novamente.'
      });
    }
  };

  deleteLancamento = async (req, res) => {
    const { id } = req.params;
    try {
      await LancamentoModel.delete(id);
      res.redirect('/lancamentos?success=Lancamento excluido com sucesso');
    } catch (error) {
      console.error('Erro ao deletar lancamento:', error);
      res.status(500).send('Erro ao deletar lancamento.');
    }
  };

  viewLancamento = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;

    try {
      const lancamento = await LancamentoModel.findById(id);
      let valor_da_parcela = null;

      if (
        lancamento.forma_de_pagamento !== 'Especie' &&
        lancamento.qtde_de_parcelas
      ) {
        valor_da_parcela = lancamento.valor / lancamento.qtde_de_parcelas;
      }

      res.status(200).render('pages/lancamentos/visualizarLancamento', {
        title: 'Visualizar Lancamento',
        lancamento,
        success: undefined,
        error: undefined,
        valor_da_parcela,
        ultima_edicao: lancamento.ultima_edicao,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lancamento:', error);
      res.status(500).send('Erro ao buscar lancamento.');
    }
  };

  search = async (req, res) => {
    const { termo } = req.body;
    const usuario = req.user;
    try {
      const lancamentos = await LancamentoModel.search(termo);
      res.status(200).render('pages/lancamentos/tabelaLancamento', {
        title: 'Resultados da Pesquisa - Lancamentos',
        lancamentos,
        search: true,
        usuario
      });
    } catch (error) {
      console.error('Erro ao buscar lancamentos:', error);
      res.status(500).send('Erro ao buscar lancamentos.');
    }
  };
}

export default new LancamentoController();
