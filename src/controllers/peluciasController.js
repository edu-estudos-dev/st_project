import peluciasModel from '../models/peluciasModel.js';

class PeluciasController {

    addSangriaForm = async (req, res) => {
        const usuario = req.session?.user || null;
        try {
            console.log('Chamando addSangriaForm');
            const estabelecimentos = await peluciasModel.getEstabelecimentos();
            const ultimaLeitura = estabelecimentos.length > 0 ? await peluciasModel.getUltimaLeitura(estabelecimentos[0].id) : { ultima_leitura: 0 };
            const ultimoEstoque = estabelecimentos.length > 0 ? await peluciasModel.getUltimoEstoque(estabelecimentos[0].id) : { estoque: 0 };

            res.render('pages/pelucias/cadastrarSangriaPelucia', {
                estabelecimentos,
                usuario,
                ultimaLeitura: ultimaLeitura.ultima_leitura,
                ultimoEstoque: ultimoEstoque.estoque
            });
        } catch (error) {
            console.error('Erro ao carregar o formulário de sangria:', error);
            res.status(500).send('Erro ao carregar o formulário de sangria.');
        }
    };

    addSangria = async (req, res) => {
        const { estabelecimento_id,
            data_sangria,
            leitura_atual,
            abastecido,
            valor_apurado,
            comissao,
            valor_comerciante,
            valor_liquido,
            tipo_pagamento,
            observacoes } = req.body;
        try {
            console.log('Chamando addSangria');
            const ultimaLeitura = await peluciasModel.getUltimaLeitura(estabelecimento_id);
            const ultimoEstoque = await peluciasModel.getUltimoEstoque(estabelecimento_id);
            const ultimaDataSangria = await peluciasModel.getUltimaDataSangria(estabelecimento_id);

            if (new Date(data_sangria) <= new Date(ultimaDataSangria.data_sangria)) {
                return res.status(400).send('Erro: A data do novo cadastro não pode ser anterior ou igual à data da última sangria cadastrada.');
            }

            const qtdeVendido = (ultimaLeitura.ultima_leitura === 0) ? 0 : leitura_atual - (ultimaLeitura.ultima_leitura || 0);
            const estoque = (ultimoEstoque.estoque || 0) - qtdeVendido + parseInt(abastecido, 10);

            await peluciasModel.updateUltimaLeitura(estabelecimento_id, leitura_atual);
            await peluciasModel.createSangria({
                estabelecimento_id,
                data_sangria,
                leitura_atual,
                ultima_leitura: leitura_atual,
                abastecido,
                qtde_vendido: qtdeVendido,
                valor_apurado,
                comissao,
                valor_comerciante,
                valor_liquido,
                tipo_pagamento,
                observacoes,
                estoque
            });

            res.redirect('/pelucias/sangrias');
        } catch (error) {
            console.error('Erro ao adicionar sangria:', error);
            res.status(500).send('Erro ao adicionar sangria.');
        }
    };

    index = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando index');
            const sangrias = await peluciasModel.getSangrias();
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
        const usuario = req.session.user;
        try {
            console.log('Chamando editSangriaForm');
            const id = req.params.id;
            const estabelecimentos = await peluciasModel.getEstabelecimentos();
            const sangria = await peluciasModel.getSangriaById(id);

            if (!sangria) {
                return res.status(404).send('Sangria não encontrada.');
            }

            res.render('pages/pelucias/editarSangriaPelucia', {
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
            console.log('Chamando updateSangria');
            const { id,
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao,
                tipo_pagamento,
                observacoes,
                leitura_atual,
                abastecido,
                qtde_vendido } = req.body;
            const valor_da_comissao = valor_apurado * (comissao / 100);
            const valor_liquido = valor_apurado - valor_da_comissao;

            const qtdeVendidoAtualizado = qtde_vendido ? qtde_vendido : null;

            await peluciasModel.updateSangria({
                id,
                estabelecimento_id,
                data_sangria,
                valor_apurado,
                comissao: parseFloat(comissao),
                valor_comerciante: valor_da_comissao,
                valor_liquido,
                tipo_pagamento,
                observacoes,
                leitura_atual,
                abastecido,
                qtde_vendido: qtdeVendidoAtualizado
            });
            res.redirect('/pelucias/sangrias?success=Sangria atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar sangria:', error);
            res.redirect('/pelucias/sangrias?error=Erro ao atualizar sangria');
        }
    };

    deleteSangria = async (req, res) => {
        try {
            console.log('Chamando deleteSangria');
            const id = req.params.id;
            await peluciasModel.deleteSangria(id);
            res.status(200).json({ success: true, message: 'Sangria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir sangria' });
        }
    };

    viewSangria = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando viewSangria');
            const id = req.params.id;
            const sangria = await peluciasModel.getSangriaById(id);

            if (!sangria) {
                return res.status(404).send('Sangria não encontrada.');
            }

            res.render('pages/pelucias/visualizarDadosPelucia', { sangria, usuario });
        } catch (error) {
            console.error('Erro ao carregar os detalhes da sangria:', error);
            res.status(500).send('Erro ao carregar os detalhes da sangria.');
        }
    };

    getReceitaPelucias = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando getReceitaPelucias');
            const receita = await peluciasModel.getMonthlyRevenue();
            res.render('pages/pelucias/receitaPelucia', {
                receita,
                usuario
            });
        } catch (error) {
            console.error('Erro ao obter receita de pelúcias:', error);
            res.status(500).json({ message: 'Erro ao obter receita de pelúcias.' });
        }
    };

    renderControleGeralPelucias = async (req, res) => {
        const usuario = req.session.user;
        try {
            console.log('Chamando renderControleGeralPelucias');
            const dadosControleGeral = await peluciasModel.getLatestSangriaForAllEstabelecimentos();

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
        const usuario = req.session?.user || null;
        try {
            console.log('Chamando controleGeral');
            const estabelecimentos = await peluciasModel.getAllSangrias();

            res.render('pages/pelucias/controleGeralPelucias', {
                estabelecimentos,
                usuario
            });
        } catch (error) {
            console.error('Erro ao carregar o controle geral das pelúcias:', error);
            res.status(500).send('Erro ao carregar o controle geral das pelúcias.');
        }
    };

    getUltimaLeitura = async (req, res) => {
        const { estabelecimentoId } = req.params;
        try {
            console.log('Chamando getUltimaLeitura');
            const ultimaLeitura = await peluciasModel.getUltimaLeitura(estabelecimentoId);
            res.json({ ultima_leitura: ultimaLeitura.ultima_leitura });
        } catch (error) {
            console.error('Erro ao buscar a última leitura:', error);
            res.status(500).json({ error: 'Erro ao buscar a última leitura' });
        }
    };
}

export default new PeluciasController();
