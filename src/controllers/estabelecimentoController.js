import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import { formatTelefone } from '../utilities/formatters.js';

class EstabelecimentoController {

    // Renderiza a tabela de estabelecimentos
    index = async (req, res) => {
        const usuario = req.session.user;
        try {
            // Busca todos os estabelecimentos ativos
            let estabelecimentos = await EstabelecimentoModel.findAll();

            // Formata os números de telefone
            estabelecimentos = estabelecimentos.map(estabelecimento => {
                estabelecimento.telefone_contato = formatTelefone(estabelecimento.telefone_contato);
                return estabelecimento;
            });

            res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                title: "Tabela Com os Estabelecimentos",
                estabelecimentos: estabelecimentos, // Passa os estabelecimentos para a visualização
                search: false, // Indica que não é uma pesquisa
                usuario
            });
        } catch (error) {
            console.error('Erro ao obter todos os estabelecimentos.', error);
            res.status(500).json({ message: 'Erro ao obter todos os estabelecimentos.' });
        }
    }


    // Processa a pesquisa de estabelecimentos
    find = async (req, res) => {
        const usuario = req.session.user;
        try {
            const query = req.body.estabelecimento; // Obtém o termo de pesquisa
            // Busca os estabelecimentos que correspondem ao termo de pesquisa e estão ativos
            const estabelecimentos = await EstabelecimentoModel.search(query);
            res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                title: "Search Results", // Define o título da página de resultados de pesquisa
                estabelecimentos: estabelecimentos, // Passa os resultados da pesquisa para a visualização 
                search: true, // Indica que é uma pesquisa
                usuario
            });
        } catch (error) {
            console.error('Erro ao obter estabelecimento.', error);
            res.status(500).json({ message: 'Erro ao obter estabelecimento.' });
        }
    }

    // Adiciona um novo estabelecimento
    addEstabelecimento = async (req, res) => {
        const usuario = req.session.user;
        if (req.method === "GET") {
            res.render('pages/estabelecimentos/cadastrarEstabelecimento', {
                title: 'Cadastrar Estabelecimento', // Define o título da página
                success: null,
                error: null,
                usuario
            });
        } else {
            try {
                // Verificação de campos obrigatórios
                const requiredFields = ['estabelecimento', 'endereco', 'bairro', 'responsavel_nome', 'telefone_contato'];
                for (const field of requiredFields) {
                    if (!req.body[field]) {
                        // Lança um erro se algum campo obrigatório estiver faltando
                        throw new Error(`Campo obrigatório faltando: ${field}`);
                    }
                }

                // Captura os produtos selecionados
                const produtos = req.body.produto; // Isso será um array de valores

                const estabelecimento = {
                    estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
                    produto: Array.isArray(produtos) ? produtos.map(p => p.trim().toUpperCase()).join(', ') : produtos.trim().toUpperCase(),
                    chave: req.body.chave ? req.body.chave.trim() : '',
                    maquina: req.body.maquina ? req.body.maquina.trim() : '',
                    endereco: req.body.endereco.trim().toUpperCase(),
                    bairro: req.body.bairro.trim().toUpperCase(),
                    responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
                    telefone_contato: req.body.telefone_contato.trim(),
                    observacoes: req.body.observacoes ? req.body.observacoes.trim().toUpperCase() : ''
                };

                await EstabelecimentoModel.create(estabelecimento); // Cria um novo estabelecimento
                res.status(201).render('pages/estabelecimentos/cadastrarEstabelecimento', {
                    title: 'Cadastrar Estabelecimento',
                    estabelecimento: estabelecimento,
                    success: 'Estabelecimento cadastrado com sucesso!',
                    error: null,
                    usuario
                });
            } catch (error) {
                console.error('Erro ao cadastrar novo estabelecimento. Detalhes do erro:', error);
                res.status(500).render('pages/estabelecimentos/cadastrarEstabelecimento', {
                    title: 'Cadastrar Estabelecimento',
                    success: null,
                    usuario,
                    error: error.message || 'Erro ao cadastrar novo estabelecimento. Por favor, tente novamente.'
                });
            }
        }
    }

    // Atualiza um estabelecimento existente
    editEstabelecimento = async (req, res) => {
        const usuario = req.session.user;
        try {
            const id = req.params.id; // Obtém o ID do estabelecimento
            let produtos = req.body.produto;
            if (Array.isArray(produtos)) {
                produtos = produtos.map(p => p.trim().toUpperCase()).join(', ');
            } else {
                produtos = produtos.trim().toUpperCase();
            }
            const estabelecimento = {
                estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
                status: req.body.status ? req.body.status.trim().toUpperCase() : 'ativo', // Adiciona o campo status
                produto: produtos,
                chave: req.body.chave ? req.body.chave.trim() : '',
                maquina: req.body.maquina ? req.body.maquina.trim().toUpperCase() : '',
                endereco: req.body.endereco.trim().toUpperCase(),
                bairro: req.body.bairro.trim().toUpperCase(),
                responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
                telefone_contato: req.body.telefone_contato.trim(),
                observacoes: req.body.observacoes ? req.body.observacoes.trim().toUpperCase() : ''
            };
            await EstabelecimentoModel.update(id, estabelecimento);
            // Atualiza o estabelecimento
            res.status(200).render('pages/estabelecimentos/editarEstabelecimento', {
                title: 'Editar Estabelecimento',
                estabelecimento: estabelecimento,
                success: 'Estabelecimento atualizado com sucesso!',
                error: null,
                usuario
            });
        } catch (error) {
            console.error('Erro ao atualizar o estabelecimento. Detalhes do erro:', error);
            res.status(500).render('pages/estabelecimentos/editarEstabelecimento', {
                title: 'Editar Estabelecimento',
                estabelecimento: req.body,
                success: null,
                usuario,
                error: 'Erro ao atualizar estabelecimento.'
            });
        }
    }

    // Renderiza o formulário de edição de estabelecimento
    editEstabelecimentoForm = async (req, res) => {
        const usuario = req.session.user;
        try {
            const id = req.params.id; // Obtém o ID do estabelecimento
            const estabelecimento = await EstabelecimentoModel.findById(id); // Busca o estabelecimento pelo ID
            if (!estabelecimento) {
                // Renderiza a página 404 se o estabelecimento não for encontrado
                return res.status(404).render('pages/404', { title: 'Estabelecimento Não Encontrado' });
            }
            res.status(200).render('pages/estabelecimentos/editarEstabelecimento', {
                title: 'Editar Estabelecimento', // Define o título da página
                estabelecimento: estabelecimento,
                success: null,
                error: null,
                usuario
            });
        } catch (error) {
            console.error('Erro ao buscar dados do estabelecimento.', error);
            res.status(500).json({ message: 'Erro ao buscar dados do estabelecimento.' });
        }
    }

    // Método para visualizar um estabelecimento
    viewEstabelecimento = async (req, res) => {
        const usuario = req.session.user; // Obtém o usuário da sessão
        const { id } = req.params;

        try {
            const estabelecimento = await EstabelecimentoModel.findById(id);

            res.status(200).render('pages/estabelecimentos/visualizarEstabelecimento', {
                title: 'Visualizar Estabelecimento',
                estabelecimento,
                success: undefined,
                error: undefined,
                data_atualizacao: estabelecimento.data_atualizacao, // Passa a data de atualização
                usuario
            });
        } catch (error) {
            console.error('Erro ao buscar estabelecimento:', error);
            res.status(500).send('Erro ao buscar estabelecimento.');
        }
    }

    // Deleta um estabelecimento (alterando o status para inativo)
    deleteEstabelecimento = async (req, res) => {
        try {
            const id = req.params.id; // Obtém o ID do estabelecimento
            const estabelecimento = await EstabelecimentoModel.findById(id);
            if (estabelecimento) {
                await EstabelecimentoModel.destroy(id); // Chama o método destroy do model, que agora também define a data de encerramento
                res.status(200).json({ message: 'Estabelecimento Excluído com Sucesso!' });
            } else {
                res.status(404).json({ message: 'Estabelecimento não encontrado.' });
            }
        } catch (error) {
            console.error('Erro ao excluir Estabelecimento.', error);
            res.status(500).json({ message: 'Erro ao excluir Estabelecimento.' });
        }
    }


    // Processa a pesquisa de estabelecimentos
    search = async (req, res) => {
        const { termo } = req.body;
        const usuario = req.session.user;
        try {
            // Pesquisar estabelecimentos que estejam ativos
            const estabelecimentos = await EstabelecimentoModel.search(termo, { where: { status: 'ativo' } });
            res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
                title: 'Resultados da Pesquisa',
                estabelecimentos: estabelecimentos,
                search: true,
                usuario
            });
        } catch (error) {
            console.error('Erro ao buscar estabelecimentos:', error);
            res.status(500).send('Erro ao buscar estabelecimentos.');
        }
    }
}


// Exporta uma instância da classe EstabelecimentoController
export default new EstabelecimentoController();
