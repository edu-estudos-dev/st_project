import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import figurinhasModel from '../models/figurinhasModel.js';
import peluciasModel from '../models/peluciasModel.js';
import { formatTelefone } from '../utilities/formatters.js';
import {
  formatProdutoList,
  hasProduto,
  normalizeSelectedProdutos,
  serializeProdutos
} from '../utilities/produtoUtils.js';

const parseCoordinate = (value, type) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const normalized = Number(String(value).replace(',', '.').trim());

  if (Number.isNaN(normalized)) {
    throw new Error(
      `Informe uma ${type === 'latitude' ? 'latitude' : 'longitude'} válida.`
    );
  }

  if (type === 'latitude' && (normalized < -90 || normalized > 90)) {
    throw new Error('A latitude deve estar entre -90 e 90.');
  }

  if (type === 'longitude' && (normalized < -180 || normalized > 180)) {
    throw new Error('A longitude deve estar entre -180 e 180.');
  }

  return normalized;
};

const PRODUCT_OPTIONS = [
  {
    value: 'BOLINHAS',
    label: 'Bolinhas',
    className: 'modern-checkbox-green'
  },
  {
    value: 'FIGURINHAS',
    label: 'Consignados',
    className: 'modern-checkbox-blue'
  },
  {
    value: 'PELUCIAS',
    label: 'Pelúcias',
    className: 'modern-checkbox-violet'
  }
];

const parseInitialInteger = (value, fieldLabel) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${fieldLabel} é obrigatório.`);
  }

  const parsed = Number.parseInt(String(value).trim(), 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(
      `${fieldLabel} deve ser um número válido maior ou igual a zero.`
    );
  }

  return parsed;
};

const getOptionalString = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const getEnabledProductOptions = (req, selectedProdutos = []) => {
  const navProducts = req.res?.locals?.navigationProducts || {};
  const selected = normalizeSelectedProdutos(selectedProdutos);

  return PRODUCT_OPTIONS.filter(option => {
    const key = option.value.toLowerCase();
    return Boolean(navProducts[key]) || selected.includes(option.value);
  });
};

const validateProdutosEnabled = (req, produtos) => {
  const enabledValues = getEnabledProductOptions(req).map(
    option => option.value
  );

  const selected = normalizeSelectedProdutos(produtos);
  const invalid = selected.filter(produto => !enabledValues.includes(produto));

  if (invalid.length) {
    throw new Error('Este produto nao esta habilitado na sua assinatura.');
  }

  return selected;
};

class EstabelecimentoController {
  index = async (req, res) => {
    const usuario = req.user;

    try {
      let estabelecimentos = await EstabelecimentoModel.findAll(
        usuario.assinante_id
      );

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

      const estabelecimentos = await EstabelecimentoModel.search(
        query,
        usuario.assinante_id
      );

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
        formData: {},
        productOptions: getEnabledProductOptions(req),
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

      const produtosSelecionados = validateProdutosEnabled(
        req,
        req.body.produto
      );

      const produtos = serializeProdutos(req.body.produto);

      if (!produtos) {
        throw new Error(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const hasBolinhas = produtosSelecionados.includes('BOLINHAS');
      const hasFigurinhas = produtosSelecionados.includes('FIGURINHAS');
      const hasPelucias = produtosSelecionados.includes('PELUCIAS');

      const chaveBolinhas = hasBolinhas
        ? getOptionalString(req.body.chave_bolinhas)
        : '';

      const maquinaBolinhas = hasBolinhas
        ? getOptionalString(req.body.maquina_bolinhas)
        : '';

      const chavePelucias = hasPelucias
        ? getOptionalString(req.body.chave_pelucias)
        : '';

      const maquinaPelucias = hasPelucias
        ? getOptionalString(req.body.maquina_pelucias)
        : '';

      const chaveLegada = chaveBolinhas || chavePelucias || '';
      const maquinaLegada = maquinaBolinhas || maquinaPelucias || '';

      const peluciaLeituraInicial = hasPelucias
        ? parseInitialInteger(
            req.body.pelucia_leitura_inicial,
            'Leitura inicial de pelúcias'
          )
        : null;

      const peluciaAbastecidoInicial = hasPelucias
        ? parseInitialInteger(
            req.body.pelucia_abastecido_inicial,
            'Abastecido inicial de pelúcias'
          )
        : null;

      const figurinhaQuantidadeInicial = hasFigurinhas
        ? parseInitialInteger(
            req.body.figurinha_quantidade_inicial,
            'Quantidade inicial deixada de consignados'
          )
        : null;

      const estabelecimento = {
        assinante_id: usuario.assinante_id,
        estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
        produto: produtos,

        // Campos antigos mantidos por compatibilidade com telas antigas.
        chave: chaveLegada,
        maquina: maquinaLegada,

        // Campos novos separados por produto.
        chave_bolinhas: chaveBolinhas,
        maquina_bolinhas: maquinaBolinhas,
        chave_pelucias: chavePelucias,
        maquina_pelucias: maquinaPelucias,

        endereco: req.body.endereco.trim().toUpperCase(),
        bairro: req.body.bairro.trim().toUpperCase(),
        responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
        telefone_contato: req.body.telefone_contato.trim(),
        observacoes: req.body.observacoes
          ? req.body.observacoes.trim().toUpperCase()
          : '',
        latitude: parseCoordinate(req.body.latitude, 'latitude'),
        longitude: parseCoordinate(req.body.longitude, 'longitude')
      };

      const novoEstabelecimento =
        await EstabelecimentoModel.create(estabelecimento);

      const dataInicial = new Date().toISOString().slice(0, 10);

      if (novoEstabelecimento?.id && hasPelucias) {
        await peluciasModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id: novoEstabelecimento.id,
          data_sangria: dataInicial,
          valor_apurado: 0,
          comissao: 0,
          valor_comerciante: 0,
          valor_liquido: 0,
          tipo_pagamento: 'especie',
          observacoes:
            '[ABERTURA INICIAL] Ponto iniciado no cadastro do estabelecimento.',
          leitura_atual: peluciaLeituraInicial,
          ultima_leitura: 0,
          abastecido: peluciaAbastecidoInicial,
          qtde_vendido: 0,
          estoque: peluciaAbastecidoInicial
        });
      }

      if (novoEstabelecimento?.id && hasFigurinhas) {
        await figurinhasModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id: novoEstabelecimento.id,
          data_sangria: dataInicial,
          qtde_deixada: figurinhaQuantidadeInicial,
          abastecido: figurinhaQuantidadeInicial,
          estoque: 0,
          qtde_vendido: 0,
          valor_apurado: 0,
          tipo_pagamento: 'especie',
          observacoes:
            '[ABERTURA INICIAL] Ponto iniciado no cadastro do estabelecimento.'
        });
      }

      let estabelecimentos = await EstabelecimentoModel.findAll(
        usuario.assinante_id
      );

      estabelecimentos = estabelecimentos.map(est => {
        est.telefone_contato = formatTelefone(est.telefone_contato);
        est.produtoFormatado = formatProdutoList(est.produto);
        return est;
      });

      return res
        .status(200)
        .render('pages/estabelecimentos/tabelaEstabelecimentos', {
          title: 'Tabela Com os Estabelecimentos',
          estabelecimentos,
          search: false,
          usuario,
          success: 'Estabelecimento cadastrado com sucesso!'
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
          productOptions: getEnabledProductOptions(req, req.body.produto),
          formData: req.body,
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

      const produtosSelecionados = validateProdutosEnabled(
        req,
        req.body.produto
      );

      const produtos = serializeProdutos(req.body.produto);

      if (!produtos) {
        throw new Error(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const hasBolinhas = produtosSelecionados.includes('BOLINHAS');
      const hasPelucias = produtosSelecionados.includes('PELUCIAS');

      const chaveBolinhas = hasBolinhas
        ? getOptionalString(req.body.chave_bolinhas)
        : '';

      const maquinaBolinhas = hasBolinhas
        ? getOptionalString(req.body.maquina_bolinhas)
        : '';

      const chavePelucias = hasPelucias
        ? getOptionalString(req.body.chave_pelucias)
        : '';

      const maquinaPelucias = hasPelucias
        ? getOptionalString(req.body.maquina_pelucias)
        : '';

      const chaveLegada = chaveBolinhas || chavePelucias || '';
      const maquinaLegada = maquinaBolinhas || maquinaPelucias || '';

      const estabelecimento = {
        id,
        estabelecimento: req.body.estabelecimento.trim().toUpperCase(),
        status: req.body.status
          ? req.body.status.trim().toUpperCase()
          : 'ATIVO',
        produto: produtos,

        // Campos antigos mantidos por compatibilidade com telas antigas.
        chave: chaveLegada,
        maquina: maquinaLegada,

        // Campos novos separados por produto.
        chave_bolinhas: chaveBolinhas,
        maquina_bolinhas: maquinaBolinhas,
        chave_pelucias: chavePelucias,
        maquina_pelucias: maquinaPelucias,

        endereco: req.body.endereco.trim().toUpperCase(),
        bairro: req.body.bairro.trim().toUpperCase(),
        responsavel_nome: req.body.responsavel_nome.trim().toUpperCase(),
        telefone_contato: req.body.telefone_contato.trim(),
        observacoes: req.body.observacoes
          ? req.body.observacoes.trim().toUpperCase()
          : '',
        latitude: parseCoordinate(req.body.latitude, 'latitude'),
        longitude: parseCoordinate(req.body.longitude, 'longitude')
      };

      await EstabelecimentoModel.update(
        usuario.assinante_id,
        id,
        estabelecimento
      );

      return res
        .status(200)
        .render('pages/estabelecimentos/editarEstabelecimento', {
          title: 'Editar Estabelecimento',
          estabelecimento,
          hasProduto,
          productOptions: getEnabledProductOptions(
            req,
            estabelecimento.produto
          ),
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
          productOptions: getEnabledProductOptions(req, req.body.produto),
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

      const estabelecimento = await EstabelecimentoModel.findById(
        id,
        usuario.assinante_id
      );

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
          productOptions: getEnabledProductOptions(
            req,
            estabelecimento.produto
          ),
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
      const estabelecimento = await EstabelecimentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (!estabelecimento) {
        return res.status(404).send('Estabelecimento nao encontrado.');
      }

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
      const usuario = req.user;
      const id = req.params.id;

      const estabelecimento = await EstabelecimentoModel.findById(
        id,
        usuario.assinante_id
      );

      if (estabelecimento) {
        await EstabelecimentoModel.destroy(id, usuario.assinante_id);

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
      const estabelecimentos = await EstabelecimentoModel.search(
        termo,
        usuario.assinante_id
      );

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