import LancamentoModel from '../models/lancamentoModel.js';
import { addMonths } from 'date-fns'; // Adicionando a biblioteca para manipulação de datas

class LancamentoController {

    // Método para listar todos os lançamentos
    index = async (req, res) => {
        try {
            const usuario = req.session.user;
            const lancamentos = await LancamentoModel.findAll();
            res.status(200).render('pages/lancamentos/tabelaLancamento', {
                title: 'Lançamentos Cadastrados',
                lancamentos: lancamentos,
                pageTitle: 'Lançamentos Cadastrados',
                usuario: usuario
            });
        } catch (error) {
            console.error('Erro ao listar lançamentos:', error);
            res.status(500).send('Erro ao listar lançamentos.');
        }
    };


    // Método para atualizar o venciment
    updateVencimento = async (req, res) => {
        const { id } = req.params;
        const { vencimento } = req.body;
        try {
            await LancamentoModel.updateVencimento(id, vencimento);
            res.status(200).redirect('/lancamentos');
        } catch (error) {
            console.error('Erro ao atualizar vencimento:', error);
            res.status(500).send('Erro ao atualizar vencimento.');
        }
    };


    // Método para exibir o formulário de adicionar lançamento
    addLancamentoForm = (req, res) => {
        const usuario = req.session.user;
        res.render('pages/lancamentos/cadastrarLancamentos', {
            title: 'Adicionar Lançamento',
            usuario,
            success: undefined,
            error: undefined,
            usuario,
        });
    };


    // Método para adicionar um novo lançamento
    addLancamento = async (req, res) => {
        const usuario = req.session.user;
        const { entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            qtde_de_parcelas,
            valor,
            descricao } = req.body;

        // Verifica se todos os parâmetros estão definidos
        if (!entrada_saida || !data || !tipo_de_lancamento || !produto || !forma_de_pagamento ||
            qtde_de_parcelas === undefined || !valor || !descricao || !usuario) {
            return res.status(400).send('Todos os campos são obrigatórios.');
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
            res.status(201).render('pages/lancamentos/cadastrarLancamentos', {
                title: 'Adicionar Lançamento',
                success: 'Lançamento cadastrado com sucesso!',
                error: null,
                usuario
            });
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


    // Método para exibir o formulário de edição de lançamento
    editLancamentoForm = async (req, res) => {
        const usuario = req.session.user; 
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
                usuario: usuario
            });
        } catch (error) {
            console.error('Erro ao buscar lançamento:', error);
            res.status(500).send('Erro ao buscar lançamento.');
        }
    };


    // Método para atualizar um lançamento existente
    editLancamento = async (req, res) => {
        const usuario = req.session.user;
        const { id } = req.params;
        const { entrada_saida,
            data,
            tipo_de_lancamento,
            produto,
            forma_de_pagamento,
            qtde_de_parcelas,
            valor,
            descricao } = req.body;

        // Verifica se todos os parâmetros estão definidos
        if (!entrada_saida || !data || !tipo_de_lancamento || !produto || !forma_de_pagamento ||
            qtde_de_parcelas === undefined || !valor || !descricao) {
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


    // Método para deletar um lançamento
    deleteLancamento = async (req, res) => {
        const { id } = req.params;
        try {
            await LancamentoModel.delete(id);
            res.redirect('/lancamentos');
        } catch (error) {
            console.error('Erro ao deletar lançamento:', error);
            res.status(500).send('Erro ao deletar lançamento.');
        }
    };


    // Método para visualizar um lançamento
    viewLancamento = async (req, res) => {
        const usuario = req.session.user; 
        const { id } = req.params;

        try {
            const lancamento = await LancamentoModel.findById(id);
            let valor_da_parcela = null;

            if (lancamento.forma_de_pagamento !== 'Espécie' && lancamento.qtde_de_parcelas) {
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


    // Método para buscar lançamentos com base em um termo de pesquisa
    search = async (req, res) => {
        const { termo } = req.body;
        const usuario = req.session.user;
        try {
            const lancamentos = await LancamentoModel.search(termo);
            res.status(200).render('pages/lancamentos/tabelaLancamento', {
                title: 'Resultados da Pesquisa - Lançamentos',
                lancamentos: lancamentos,
                search: true,
                usuario
            });
        } catch (error) {
            console.error('Erro ao buscar lançamentos:', error);
            res.status(500).send('Erro ao buscar lançamentos.');
        }
    }
}

export default new LancamentoController();
