import LancamentoModel from '../models/lancamentoModel.js';
import { addMonths } from 'date-fns';

class LancamentoController {
  index = async (req, res) => {
    try {
      const usuario = req.user;
      const tipoFiltro = (req.query.tipo || 'todos').toLowerCase();
      let lancamentos = await LancamentoModel.findAll();

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

  updateVencimento = async (req, res) => {
    const { id } = req.params;
    const { vencimento } = req.body;

    try {
      const lancamento = await LancamentoModel.findById(id);

      if (!lancamento) {
        return res.redirect('/lancamentos?error=Lançamento não encontrado');
      }

      await LancamentoModel.updateVencimento(id, vencimento);

      const parcelaMatch = String(lancamento.descricao || '').match(/^(.*) - Parcela (\d+)\/(\d+)$/);

      if (parcelaMatch) {
        const descricaoBase = parcelaMatch[1];
        const parcelaAtual = Number(parcelaMatch[2]);
        const totalParcelas = Number(parcelaMatch[3]);
        const grupoParcelas = await LancamentoModel.findParcelGroup({
          entrada_saida: lancamento.entrada_saida,
          tipo_de_lancamento: String(lancamento.tipo_de_lancamento || '').replace(/ /g, '_').toLowerCase(),
          produto: lancamento.produto,
          forma_de_pagamento: lancamento.forma_de_pagamento,
          usuario: lancamento.usuario,
          descricaoBase
        });

        if (grupoParcelas.length >= totalParcelas) {
          const baseDate = new Date(`${vencimento}T00:00:00`);

          for (const parcela of grupoParcelas) {
            const siblingMatch = String(parcela.descricao || '').match(/ - Parcela (\d+)\/(\d+)$/);
            if (!siblingMatch) continue;

            const numeroParcela = Number(siblingMatch[1]);
            const nextDate = addMonths(baseDate, numeroParcela - parcelaAtual);
            const nextDateString = nextDate.toISOString().split('T')[0];

            if (String(parcela.id) !== String(id)) {
              await LancamentoModel.updateVencimento(parcela.id, nextDateString);
            }
          }
        }
      }

      res.redirect('/lancamentos?success=Vencimento atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar vencimento:', error);
      res.redirect('/lancamentos?error=Erro ao atualizar vencimento');
    }
  };

  vencimentos = async (req, res) => {
    const usuario = req.user;

    try {
      const { proximos, atrasados } = await LancamentoModel.getNotificationAlerts(5);

      res.render('pages/lancamentos/vencimentos', {
        title: 'Vencimentos',
        usuario,
        proximos,
        atrasados,
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

    try {
      if (entrada_saida === 'Saida' && qtde_de_parcelas > 1) {
        const valorParcela = valor / qtde_de_parcelas;
        for (let i = 0; i < qtde_de_parcelas; i++) {
          await LancamentoModel.create({
            entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            qtde_de_parcelas,
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
      const lancamento = await LancamentoModel.findById(id);
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
        title: 'Editar Lançamento',
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
    const { id } = req.params;
    try {
      await LancamentoModel.delete(id);
      res.redirect('/lancamentos?success=Lançamento excluído com sucesso');
    } catch (error) {
      console.error('Erro ao deletar lançamento:', error);
      res.status(500).send('Erro ao deletar lançamento.');
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
        title: 'Visualizar Lançamento',
        lancamento,
        success: undefined,
        error: undefined,
        valor_da_parcela,
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
      const lancamentos = await LancamentoModel.search(termo);
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
