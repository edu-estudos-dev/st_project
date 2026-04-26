import BolinhasSangriaModel from '../models/BolinhasModel.js';
import EstabelecimentoModel from '../models/estabelecimentoModel.js';

class BolinhasController {

    // Método para exibir o formulário
    addSangriaForm = async (req, res) => {
        const usuario = req.user;
        try {
            const estabelecimentos = await BolinhasSangriaModel.getEstabelecimentos(usuario.assinante_id);
            res.render('pages/bolinhas/cadastrarSangriaBolinha', { estabelecimentos, usuario });
        } catch (error) {
            console.error('Erro ao carregar o formulário de sangria:', error);
            res.status(500).send('Erro ao carregar o formulário de sangria.');
        };
    };


    // Método para adicionar uma nova sangria
    addSangria = async (req, res) => {
        try {
            const usuario = req.user;
            const { estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                tipo_pagamento,
                observacoes } = req.body;

            const valor_da_comissao = valor_apurado * (comissao / 100);
            const valor_liquido = valor_apurado - valor_da_comissao;

            await BolinhasSangriaModel.createSangria({
                assinante_id: usuario.assinante_id,
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                valor_comerciante: valor_da_comissao,
                valor_liquido,
                tipo_pagamento,
                observacoes
            });

            res.redirect('/bolinhas/sangrias?success=Sangria adicionada com sucesso');
        } catch (error) {
            console.error('Erro ao adicionar sangria:', error);
            res.redirect('/bolinhas/sangrias?error=Erro ao adicionar sangria');
        };
    };


    // Método para listar todas as sangrias
    index = async (req, res) => {
        const usuario = req.user;

        try {
            const sangriasFiltradas = await BolinhasSangriaModel.getSangrias(usuario.assinante_id);
            const { success, error } = req.query;
            res.render('pages/bolinhas/tabelaBolinha', {
                sangrias: sangriasFiltradas,
                usuario,
                success,
                error
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
            const estabelecimentos = await BolinhasSangriaModel.getEstabelecimentos(usuario.assinante_id);
            const sangria = await BolinhasSangriaModel.getSangriaById(id, usuario.assinante_id);

            if (!sangria.length) {
                return res.status(404).send('Sangria não encontrada.');
            }

            res.render('pages/bolinhas/editarSangiaBolinha', {
                estabelecimentos,
                sangria: sangria[0],
                usuario });
        } catch (error) {
            console.error('Erro ao carregar o formulário de edição de sangria:', error);
            res.status(500).send('Erro ao carregar o formulário de edição de sangria.');
        };
    };


    // Método para atualizar uma sangria
    updateSangria = async (req, res) => {
        try {
            const usuario = req.user;
            const { id,
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                tipo_pagamento,
                observacoes } = req.body;

            const valor_da_comissao = valor_apurado * (comissao / 100);
            const valor_liquido = valor_apurado - valor_da_comissao;

            await BolinhasSangriaModel.updateSangria({
                assinante_id: usuario.assinante_id,
                id,
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao: parseFloat(comissao),
                valor_comerciante: valor_da_comissao,
                valor_liquido,
                tipo_pagamento,
                observacoes
            });

            res.redirect('/bolinhas/sangrias?success=Sangria atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            res.redirect('/bolinhas/sangrias?error=Erro ao atualizar sangria');
        };
    };


    // Método para deletar uma sangria
    deleteSangria = async (req, res) => {
        try {
            const usuario = req.user;
            const id = req.params.id;
            await BolinhasSangriaModel.deleteSangria(id, usuario.assinante_id);
            res.status(200).json({ success: true, message: 'Sangria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir sangria' });
        };
    };


    // Método para exibir os detalhes de uma sangria
    viewSangria = async (req, res) => {
        const usuario = req.user;
        try {
            const id = req.params.id;
            const sangria = await BolinhasSangriaModel.getSangriaById(id, usuario.assinante_id);

            if (sangria.length === 0) {
                return res.status(404).send('Sangria não encontrada.');
            };

            res.render('pages/bolinhas/visualizarDadosBolinha', {
                sangria: sangria[0],
                usuario });
        } catch (error) {
            console.error('Erro ao carregar os detalhes da sangria:', error);
            res.status(500).send('Erro ao carregar os detalhes da sangria.');
        };
    };


    // Método para obter a receita agrupada por mês e ano
    getReceitaBolinhas = async (req, res) => {
        const usuario = req.user;
        try {
            const receita = await BolinhasSangriaModel.getMonthlyRevenue(usuario.assinante_id);
            res.render('pages/bolinhas/receitaBolinha', {
                receita,
                usuario });
        } catch (error) {
            console.error('Erro ao obter receita de bolinhas:', error);
            res.status(500).json({ message: 'Erro ao obter receita de bolinhas.' });
        };
    };


    // Método para renderizar o controle geral
    renderControleGeral = async (req, res) => {
        const usuario = req.user;
        try {
            const dadosControleGeral = await BolinhasSangriaModel.getControleGeral(usuario.assinante_id);
            const bairros = await EstabelecimentoModel.getBairrosByProduto('BOLINHAS', usuario.assinante_id);
            res.render('pages/bolinhas/controleGeralBolinhas', {
                estabelecimentos: dadosControleGeral,
                bairros: bairros,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar controle geral:', error);
            res.status(500).send('Erro ao carregar controle geral.');
        };
    };
};

export default new BolinhasController();

