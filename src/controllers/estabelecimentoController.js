import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import { formatTelefone } from '../utilities/formatters.js';
import {
  formatProdutoList,
  hasProduto,
  serializeProdutos
} from '../utilities/produtoUtils.js';

class EstabelecimentoController {
  index = async (req, res) => {
    const usuario = req.user;
    try {
      let estabelecimentos = await EstabelecimentoModel.findAll();

      estabelecimentos = estabelecimentos.map(estabelecimento => {
        estabelecimento.telefone_contato = formatTelefone(
          estabelecimento.telefone_contato
        );
        estabelecimento.produtoFormatado = formatProdutoList(
          estabelecimento.produto
        );
        return estabelecimento;
      });

      res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
        title: 'Tabela Com os Estabelecimentos',
        estabelecimentos,
        search: false,
        usuario
      });
    } catch (error) {
      console.error('Erro ao obter todos os estabelecimentos.', error);
      res
        .status(500)
        .json({ message: 'Erro ao obter todos os estabelecimentos.' });
    }
  };

  find = async (req, res) => {
    const usuario = req.user;
    try {
      const query = req.body.estabelecimento;
      const estabelecimentos = await EstabelecimentoModel.search(query);

      res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
        title: 'Search Results',
        estabelecimentos,
        search: true,
        usuario
      });
    } catch (error) {
      console.error('Erro ao obter estabelecimento.', error);
      res.status(500).json({ message: 'Erro ao obter estabelecimento.' });
    }
  };

  addEstabelecimento = async (req, res) => {
    const usuario = req.user;

    if (req.method === 'GET') {
      return res.render('pages/estabelecimentos/cadastrarEstabelecimento', {
        title: 'Cadastrar Estabelecimento',
        success: null,
        error: null,
        usuario
      });
    }

    try {
      const requiredFields = [
        'estabelecimento',
        'endereco',
        'bairro',
        'responsavel_nome',
        'telefone_contato'
      ];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          throw new Error(`Campo obrigatório faltando: ${field}`);
        }
      }

      const produtos = serializeProdutos(req.body.produto);
      if (!produtos) {
        throw new Error(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const estabelecimento = {
        estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
        produto: produtos,
        chave: req.body.chave ? req.body.chave.trim() : '',
        maquina: req.body.maquina ? req.body.maquina.trim() : '',
        endereco: req.body.endereco.trim().toUpperCase(),
        bairro: req.body.bairro.trim().toUpperCase(),
        responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
        telefone_contato: req.body.telefone_contato.trim(),
        observacoes: req.body.observacoes
          ? req.body.observacoes.trim().toUpperCase()
          : ''
      };

      await EstabelecimentoModel.create(estabelecimento);
      return res
        .status(201)
        .render('pages/estabelecimentos/cadastrarEstabelecimento', {
          title: 'Cadastrar Estabelecimento',
          estabelecimento,
          success: 'Estabelecimento cadastrado com sucesso!',
          error: null,
          usuario
        });
    } catch (error) {
      console.error(
        'Erro ao cadastrar novo estabelecimento. Detalhes do erro:',
        error
      );
      return res
        .status(500)
        .render('pages/estabelecimentos/cadastrarEstabelecimento', {
          title: 'Cadastrar Estabelecimento',
          success: null,
          usuario,
          error:
            error.message ||
            'Erro ao cadastrar novo estabelecimento. Por favor, tente novamente.'
        });
    }
  };

  editEstabelecimento = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;
      const produtos = serializeProdutos(req.body.produto);

      if (!produtos) {
        throw new Error(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const estabelecimento = {
        id,
        estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
        status: req.body.status
          ? req.body.status.trim().toUpperCase()
          : 'ATIVO',
        produto: produtos,
        chave: req.body.chave ? req.body.chave.trim() : '',
        maquina: req.body.maquina ? req.body.maquina.trim().toUpperCase() : '',
        endereco: req.body.endereco.trim().toUpperCase(),
        bairro: req.body.bairro.trim().toUpperCase(),
        responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
        telefone_contato: req.body.telefone_contato.trim(),
        observacoes: req.body.observacoes
          ? req.body.observacoes.trim().toUpperCase()
          : ''
      };

      await EstabelecimentoModel.update(id, estabelecimento);
      return res
        .status(200)
        .render('pages/estabelecimentos/editarEstabelecimento', {
          title: 'Editar Estabelecimento',
          estabelecimento,
          hasProduto,
          success: 'Estabelecimento atualizado com sucesso!',
          error: null,
          usuario
        });
    } catch (error) {
      console.error(
        'Erro ao atualizar o estabelecimento. Detalhes do erro:',
        error
      );
      return res
        .status(500)
        .render('pages/estabelecimentos/editarEstabelecimento', {
          title: 'Editar Estabelecimento',
          estabelecimento: req.body,
          hasProduto,
          success: null,
          usuario,
          error: error.message || 'Erro ao atualizar estabelecimento.'
        });
    }
  };

  editEstabelecimentoForm = async (req, res) => {
    const usuario = req.user;
    try {
      const id = req.params.id;
      const estabelecimento = await EstabelecimentoModel.findById(id);

      if (!estabelecimento) {
        return res
          .status(404)
          .render('pages/404', { title: 'Estabelecimento Não Encontrado' });
      }

      return res
        .status(200)
        .render('pages/estabelecimentos/editarEstabelecimento', {
          title: 'Editar Estabelecimento',
          estabelecimento,
          hasProduto,
          success: null,
          error: null,
          usuario
        });
    } catch (error) {
      console.error('Erro ao buscar dados do estabelecimento.', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar dados do estabelecimento.' });
    }
  };

  viewEstabelecimento = async (req, res) => {
    const usuario = req.user;
    const { id } = req.params;

    try {
      const estabelecimento = await EstabelecimentoModel.findById(id);
      estabelecimento.produtoFormatado = formatProdutoList(
        estabelecimento.produto
      );

      return res
        .status(200)
        .render('pages/estabelecimentos/visualizarEstabelecimento', {
          title: 'Visualizar Estabelecimento',
          estabelecimento,
          success: undefined,
          error: undefined,
          data_atualizacao: estabelecimento.data_atualizacao,
          usuario
        });
    } catch (error) {
      console.error('Erro ao buscar estabelecimento:', error);
      return res.status(500).send('Erro ao buscar estabelecimento.');
    }
  };

  deleteEstabelecimento = async (req, res) => {
    try {
      const id = req.params.id;
      const estabelecimento = await EstabelecimentoModel.findById(id);

      if (estabelecimento) {
        await EstabelecimentoModel.destroy(id);
        return res
          .status(200)
          .json({ message: 'Estabelecimento Excluído com Sucesso!' });
      }

      return res
        .status(404)
        .json({ message: 'Estabelecimento não encontrado.' });
    } catch (error) {
      console.error('Erro ao excluir Estabelecimento.', error);
      return res
        .status(500)
        .json({ message: 'Erro ao excluir Estabelecimento.' });
    }
  };

  search = async (req, res) => {
    const { termo } = req.body;
    const usuario = req.user;
    try {
      const estabelecimentos = await EstabelecimentoModel.search(termo, {
        where: { status: 'ativo' }
      });
      return res
        .status(200)
        .render('pages/estabelecimentos/tabelaEstabelecimentos', {
          title: 'Resultados da Pesquisa',
          estabelecimentos,
          search: true,
          usuario
        });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
      return res.status(500).send('Erro ao buscar estabelecimentos.');
    }
  };
}

export default new EstabelecimentoController();
