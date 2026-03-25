import peluciasModel from '../models/peluciasModel.js';

class PeluciasController {
    addSangriaForm = async (req, res) => {
        const usuario = req.user || null;
        try {
            const estabelecimentos = await peluciasModel.getEstabelecimentos();

            res.render('pages/pelucias/cadastrarSangriaPelucia', {
                estabelecimentos,
                usuario,
                ultimaLeitura: '',
                ultimoEstoque: ''
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
            leitura_atual,
            abastecido,
            valor_apurado,
            comissao,
            tipo_pagamento,
            observacoes
        } = req.body;

        try {
            const ultimoRegistro = await peluciasModel.getUltimosDados(estabelecimento_id);
            const ultimaDataSangria = await peluciasModel.getUltimaDataSangria(estabelecimento_id);

            const leituraAnterior = Number(ultimoRegistro.ultima_leitura || 0);
            const leituraAtual = Number(leitura_atual || 0);
            const quantidadeAbastecida = Number(abastecido || 0);

            if (new Date(data_sangria) <= new Date(ultimaDataSangria.data_sangria)) {
                return res.redirect('/pelucias/sangrias?error=A data do novo cadastro nao pode ser anterior ou igual a data da ultima sangria cadastrada.');
            }

            if (leituraAtual < leituraAnterior) {
                return res.redirect('/pelucias/sangrias/add?error=A leitura atual nao pode ser menor que a ultima leitura registrada.');
            }

            const qtdeVendido = leituraAtual - leituraAnterior;
            const estoque = Number(ultimoRegistro.estoque || 0) - qtdeVendido + quantidadeAbastecida;
            const valorDaComissao = Number(valor_apurado || 0) * (Number(comissao || 0) / 100);
            const valorLiquido = Number(valor_apurado || 0) - valorDaComissao;

            await peluciasModel.createSangria({
                estabelecimento_id,
                data_sangria,
                leitura_atual: leituraAtual,
                ultima_leitura: leituraAnterior,
                abastecido: quantidadeAbastecida,
                qtde_vendido: qtdeVendido,
                valor_apurado,
                comissao,
                valor_comerciante: valorDaComissao,
                valor_liquido: valorLiquido,
                tipo_pagamento,
                observacoes,
                estoque
            });

            res.redirect('/pelucias/sangrias?success=Sangria adicionada com sucesso');
        } catch (error) {
            console.error('Erro ao adicionar sangria:', error);
            res.redirect('/pelucias/sangrias?error=Erro ao adicionar sangria');
        }
    };

    index = async (req, res) => {
        const usuario = req.user;
        try {
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
        const usuario = req.user;
        try {
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

            const valorDaComissao = valor_apurado * (comissao / 100);
            const valorLiquido = valor_apurado - valorDaComissao;

            await peluciasModel.updateSangria({
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
            const id = req.params.id;
            await peluciasModel.deleteSangria(id);
            res.status(200).json({ success: true, message: 'Sangria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar sangria:', error);
            res.status(500).json({ success: false, message: 'Erro ao excluir sangria' });
        }
    };

    viewSangria = async (req, res) => {
        const usuario = req.user;
        try {
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
        const usuario = req.user;
        try {
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
        const usuario = req.user;
        try {
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
        const usuario = req.user || null;
        try {
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

    getUltimosDados = async (req, res) => {
        const { estabelecimentoId } = req.params;
        try {
            const dados = await peluciasModel.getUltimosDados(estabelecimentoId);
            res.json({
                ultima_leitura: Number(dados.ultima_leitura || 0),
                estoque: Number(dados.estoque || 0)
            });
        } catch (error) {
            console.error('Erro ao buscar os últimos dados:', error);
            res.status(500).json({ error: 'Erro ao buscar os últimos dados' });
        }
    };
}

export default new PeluciasController();
