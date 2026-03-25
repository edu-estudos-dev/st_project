import figurinhasModel from '../models/figurinhasModel.js';

class FigurinhasController {

    addSangriaForm = async (req, res) => {
        const usuario = req.session?.user || null;
        try {
            const estabelecimentos = await figurinhasModel.getEstabelecimentos();
            res.render('pages/figurinhas/cadastrarSangriaFigurinha', {
                estabelecimentos,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar o formulário de sangria:', error);
            res.status(500).send('Erro ao carregar o formulário de sangria.');
        }
    };

    addSangria = async (req, res) => {
        const {
            estabelecimento_id,
            data_sangria,
            qtde_deixada,
            abastecido,
            estoque,
            qtde_vendido,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes
        } = req.body;
        try {
            await figurinhasModel.createSangria({
                estabelecimento_id,
                data_sangria,
                qtde_deixada: parseInt(abastecido) + parseInt(estoque),
                abastecido,
                estoque,
                qtde_vendido,
                valor_apurado,
                comissao,
                valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes
            });

            res.redirect('/figurinhas/sangrias?success=Sangria adicionada com sucesso');
        } catch (error) {
            console.error('Erro ao adicionar sangria:', error);
            res.redirect('/figurinhas/sangrias?error=Erro ao adicionar sangria');
        }
    };

    index = async (req, res) => {
        const usuario = req.session.user;
        try {
            const sangrias = await figurinhasModel.getSangrias();
            const { success, error } = req.query;
            res.render('pages/figurinhas/tabelaFigurinha', {
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
        const usuario = req.session.user;
        try {
            const id = req.params.id;
            const estabelecimentos = await figurinhasModel.getEstabelecimentos();
            const sangria = await figurinhasModel.getSangriaById(id);

            if (!sangria) {
                return res.status(404).send('Sangria não encontrada.');
            }

            res.render('pages/figurinhas/editarSangriaFigurinha', {
                estabelecimentos,
                sangria,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar o formulário de edição de sangria:', error);
            res.status(500).send('Erro ao carregar o formulário de edição de sangria.');
        }
    };

    updateSangria = async (req, res) => {
        try {
            const {
                id,
                estabelecimento_id,
                data_sangria,
                qtde_deixada,
                abastecido,
                estoque,
                qtde_vendido,
                valor_apurado,
                comissao,
                tipo_pagamento,
                observacoes
            } = req.body;

            const valor_da_comissao = valor_apurado * (comissao / 100);
            const valor_liquido = valor_apurado - valor_da_comissao;

            await figurinhasModel.updateSangria({
                id,
                estabelecimento_id,
                data_sangria,
                qtde_deixada: parseInt(abastecido) + parseInt(estoque),
                abastecido,
                estoque,
                qtde_vendido,
                valor_apurado,
                comissao: parseFloat(comissao),
                valor_comerciante: valor_da_comissao,
                valor_liquido,
                tipo_pagamento,
                observacoes
            });
            res.redirect('/figurinhas/sangrias?success=Sangria atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            res.redirect('/figurinhas/sangrias?error=Erro ao atualizar sangria');
        }
    };

    deleteSangria = async (req, res) => {
        try {
            const id = req.params.id;
            await figurinhasModel.deleteSangria(id);
            res.status(200).json({ success: true, message: 'Sangria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir sangria' });
        }
    };

    viewSangria = async (req, res) => {
        const usuario = req.session.user;
        try {
            const id = req.params.id;
            const sangria = await figurinhasModel.getSangriaById(id);

            if (!sangria) {
                return res.status(404).send('Sangria não encontrada.');
            }

            res.render('pages/figurinhas/visualizarDadosFigurinha', { sangria, usuario });
        } catch (error) {
            console.error('Erro ao carregar os detalhes da sangria:', error);
            res.status(500).send('Erro ao carregar os detalhes da sangria.');
        }
    };

    getReceitaFigurinhas = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando getReceitaFigurinhas');
            const receita = await figurinhasModel.getMonthlyRevenue();
            res.render('pages/figurinhas/receitaFigurinha', {
                receita,
                usuario
            });
        } catch (error) {
            console.error('Erro ao obter receita de figurinhas:', error);
            res.status(500).json({ message: 'Erro ao obter receita de figurinhas.' });
        }
    };
    

    renderControleGeralFigurinhas = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando renderControleGeralFigurinhas');
            const dadosControleGeral = await figurinhasModel.getLatestSangriaForAllEstabelecimentos();
    
            res.render('pages/figurinhas/controleGeralFigurinhas', {
                estabelecimentos: dadosControleGeral,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar controle geral das figurinhas:', error);
            res.status(500).send('Erro ao carregar controle geral das figurinhas.');
        }
    };
    
    

    controleGeral = async (req, res) => {
        const usuario = req.session?.user || null;
        try {
            const estabelecimentos = await figurinhasModel.getAllSangrias();

            res.render('pages/figurinhas/controleGeralFigurinhas', {
                estabelecimentos,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar o controle geral das figurinhas:', error);
            res.status(500).send('Erro ao carregar o controle geral das figurinhas.');
        }
    };
};

export default new FigurinhasController();
