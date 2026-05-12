import EstabelecimentoModel from '../models/estabelecimentoModel.js';
import consignadosModel from '../models/consignadosModel.js';
import peluciasModel from '../models/peluciasModel.js';
import { formatTelefone } from '../utilities/formatters.js';
import {
  formatProdutoList,
  hasProduto,
  normalizeSelectedProdutos,
  serializeProdutos
} from '../utilities/produtoUtils.js';

const INITIAL_INTEGER_MAX = 100000;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

const isValidationError = error => error instanceof ValidationError;

const normalizeSpacing = value => String(value ?? '').replace(/\s+/g, ' ').trim();

const hasSuspiciousHtmlChars = value => /[<>]/.test(String(value ?? ''));

const hasLetters = value => /\p{L}/u.test(String(value ?? ''));

const validateTextField = (
  value,
  fieldLabel,
  {
    min = 2,
    max = 100,
    requireLetters = true
  } = {}
) => {
  const normalized = normalizeSpacing(value);

  if (!normalized) {
    throw new ValidationError(`${fieldLabel} é obrigatório.`);
  }

  if (hasSuspiciousHtmlChars(normalized)) {
    throw new ValidationError(`${fieldLabel} contém caracteres inválidos.`);
  }

  if (normalized.length < min) {
    throw new ValidationError(`${fieldLabel} deve ter pelo menos ${min} caracteres.`);
  }

  if (normalized.length > max) {
    throw new ValidationError(`${fieldLabel} deve ter no máximo ${max} caracteres.`);
  }

  if (requireLetters && !hasLetters(normalized)) {
    throw new ValidationError(`${fieldLabel} deve conter letras.`);
  }

  return normalized;
};

const validatePhone = value => {
  const raw = normalizeSpacing(value);

  if (!raw) {
    throw new ValidationError('Telefone é obrigatório.');
  }

  if (hasSuspiciousHtmlChars(raw)) {
    throw new ValidationError('Telefone contém caracteres inválidos.');
  }

  if (/[a-zA-ZÀ-ÿ]/u.test(raw)) {
    throw new ValidationError('Telefone deve conter apenas números.');
  }

  const digits = raw.replace(/\D/g, '');

  if (!/^\d+$/.test(digits)) {
    throw new ValidationError('Telefone deve conter apenas números.');
  }

  if (digits.length !== 10 && digits.length !== 11) {
    throw new ValidationError('Telefone deve ter DDD e 10 ou 11 dígitos.');
  }

  return digits;
};

const parseCoordinate = (value, type) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const raw = String(value).replace(',', '.').trim();

  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new ValidationError(
      `Informe uma ${type === 'latitude' ? 'latitude' : 'longitude'} válida.`
    );
  }

  const normalized = Number(raw);

  if (!Number.isFinite(normalized)) {
    throw new ValidationError(
      `Informe uma ${type === 'latitude' ? 'latitude' : 'longitude'} válida.`
    );
  }

  if (type === 'latitude' && (normalized < -90 || normalized > 90)) {
    throw new ValidationError('A latitude deve estar entre -90 e 90.');
  }

  if (type === 'longitude' && (normalized < -180 || normalized > 180)) {
    throw new ValidationError('A longitude deve estar entre -180 e 180.');
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
    value: 'CONSIGNADOS',
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
  const raw = normalizeSpacing(value);

  if (!raw) {
    throw new ValidationError(`${fieldLabel} é obrigatório.`);
  }

  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(
      `${fieldLabel} deve conter apenas números inteiros, sem letras, negativos, decimais ou notação científica.`
    );
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ValidationError(`${fieldLabel} deve ser um número inteiro válido.`);
  }

  if (parsed > INITIAL_INTEGER_MAX) {
    throw new ValidationError(
      `${fieldLabel} não pode ser maior que ${INITIAL_INTEGER_MAX}.`
    );
  }

  return parsed;
};

const getOptionalInitialInteger = (value, fieldLabel) => {
  const raw = normalizeSpacing(value);

  if (!raw) {
    return null;
  }

  return parseInitialInteger(raw, fieldLabel);
};

const getOptionalString = (value, fieldLabel = 'Campo opcional', max = 100) => {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = normalizeSpacing(value);

  if (!normalized) {
    return '';
  }

  if (hasSuspiciousHtmlChars(normalized)) {
    throw new ValidationError(`${fieldLabel} contém caracteres inválidos.`);
  }

  if (normalized.length > max) {
    throw new ValidationError(`${fieldLabel} deve ter no máximo ${max} caracteres.`);
  }

  return normalized;
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
    throw new ValidationError('Este produto não está habilitado na sua assinatura.');
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

      const success = null;

      res.status(200).render('pages/estabelecimentos/tabelaEstabelecimentos', {
        title: 'Tabela Com os Estabelecimentos',
        estabelecimentos,
        search: false,
        usuario,
        success,
        error: null
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
        usuario,
        success: null,
        error: null
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
      const produtosSelecionados = validateProdutosEnabled(
        req,
        req.body.produto
      );

      const produtos = serializeProdutos(req.body.produto);

      if (!produtos) {
        throw new ValidationError(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const hasBolinhas = produtosSelecionados.includes('BOLINHAS');
      const hasConsignados = produtosSelecionados.includes('CONSIGNADOS');
      const hasPelucias = produtosSelecionados.includes('PELUCIAS');

      const chaveBolinhas = hasBolinhas
        ? getOptionalString(
            req.body.chave_bolinhas,
            'Chave da máquina de bolinhas',
            50
          )
        : '';

      const maquinaBolinhas = hasBolinhas
        ? getOptionalString(
            req.body.maquina_bolinhas,
            'Número da máquina de bolinhas',
            50
          )
        : '';

      const chavePelucias = hasPelucias
        ? getOptionalString(
            req.body.chave_pelucias,
            'Chave da máquina de pelúcias',
            50
          )
        : '';

      const maquinaPelucias = hasPelucias
        ? getOptionalString(
            req.body.maquina_pelucias,
            'Número da máquina de pelúcias',
            50
          )
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

      const consignadoQuantidadeInicial = hasConsignados
        ? parseInitialInteger(
            req.body.consignado_quantidade_inicial ||
              req.body.figurinha_quantidade_inicial,
            'Quantidade inicial deixada de consignados'
          )
        : null;

      const estabelecimento = {
        assinante_id: usuario.assinante_id,
        estabelecimento: validateTextField(
          req.body.estabelecimento,
          'Nome do estabelecimento',
          {
            min: 2,
            max: 100
          }
        ).toUpperCase(),
        produto: produtos,

        // Campos antigos mantidos por compatibilidade com telas antigas.
        chave: chaveLegada,
        maquina: maquinaLegada,

        // Campos separados por produto.
        chave_bolinhas: chaveBolinhas,
        maquina_bolinhas: maquinaBolinhas,
        chave_pelucias: chavePelucias,
        maquina_pelucias: maquinaPelucias,

        // Parâmetros iniciais salvos também no cadastro do estabelecimento
        // para a tela de visualização conseguir exibir os dados atuais do ponto.
        consignado_quantidade_inicial: consignadoQuantidadeInicial,
        pelucia_leitura_inicial: peluciaLeituraInicial,
        pelucia_abastecido_inicial: peluciaAbastecidoInicial,

        endereco: validateTextField(req.body.endereco, 'Endereço', {
          min: 5,
          max: 100
        }).toUpperCase(),
        bairro: validateTextField(req.body.bairro, 'Bairro', {
          min: 2,
          max: 30
        }).toUpperCase(),
        responsavel_nome: validateTextField(
          req.body.responsavel_nome,
          'Responsável',
          {
            min: 2,
            max: 100
          }
        ).toUpperCase(),
        telefone_contato: validatePhone(req.body.telefone_contato),
        observacoes: getOptionalString(
          req.body.observacoes,
          'Comentários',
          255
        ).toUpperCase(),
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

      if (novoEstabelecimento?.id && hasConsignados) {
        await consignadosModel.createSangria({
          assinante_id: usuario.assinante_id,
          estabelecimento_id: novoEstabelecimento.id,
          data_sangria: dataInicial,
          qtde_deixada: consignadoQuantidadeInicial,
          abastecido: consignadoQuantidadeInicial,
          estoque: 0,
          qtde_vendido: 0,
          valor_apurado: 0,
          tipo_pagamento: 'especie',
          observacoes:
            '[ABERTURA INICIAL] Ponto iniciado no cadastro do estabelecimento.'
        });
      }

      return res.redirect('/estabelecimentos');
    } catch (error) {
      if (isValidationError(error)) {
        console.warn(
          'Validação bloqueou cadastro de estabelecimento:',
          error.message
        );
      } else {
        console.error(
          'Erro ao cadastrar novo estabelecimento. Detalhes do erro:',
          error
        );
      }

      return res
        .status(isValidationError(error) ? 400 : 500)
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
        throw new ValidationError(
          'Selecione pelo menos um produto para o estabelecimento.'
        );
      }

      const hasBolinhas = produtosSelecionados.includes('BOLINHAS');
      const hasConsignados = produtosSelecionados.includes('CONSIGNADOS');
      const hasPelucias = produtosSelecionados.includes('PELUCIAS');

      const chaveBolinhas = hasBolinhas
        ? getOptionalString(
            req.body.chave_bolinhas,
            'Chave da máquina de bolinhas',
            50
          )
        : '';

      const maquinaBolinhas = hasBolinhas
        ? getOptionalString(
            req.body.maquina_bolinhas,
            'Número da máquina de bolinhas',
            50
          )
        : '';

      const chavePelucias = hasPelucias
        ? getOptionalString(
            req.body.chave_pelucias,
            'Chave da máquina de pelúcias',
            50
          )
        : '';

      const maquinaPelucias = hasPelucias
        ? getOptionalString(
            req.body.maquina_pelucias,
            'Número da máquina de pelúcias',
            50
          )
        : '';

      const chaveLegada = chaveBolinhas || chavePelucias || '';
      const maquinaLegada = maquinaBolinhas || maquinaPelucias || '';

      const consignadoQuantidadeInicial = hasConsignados
        ? parseInitialInteger(
            req.body.consignado_quantidade_inicial ||
              req.body.figurinha_quantidade_inicial,
            'Quantidade inicial deixada de consignados'
          )
        : null;

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

      const estabelecimento = {
        id,
        estabelecimento: validateTextField(
          req.body.estabelecimento,
          'Nome do estabelecimento',
          {
            min: 2,
            max: 100
          }
        ).toUpperCase(),
        status: req.body.status
          ? validateTextField(req.body.status, 'Status', {
              min: 2,
              max: 30
            }).toUpperCase()
          : 'ATIVO',
        produto: produtos,

        // Campos antigos mantidos por compatibilidade com telas antigas.
        chave: chaveLegada,
        maquina: maquinaLegada,

        // Campos separados por produto.
        chave_bolinhas: chaveBolinhas,
        maquina_bolinhas: maquinaBolinhas,
        chave_pelucias: chavePelucias,
        maquina_pelucias: maquinaPelucias,

        // Parâmetros iniciais persistidos na edição.
        consignado_quantidade_inicial: consignadoQuantidadeInicial,
        pelucia_leitura_inicial: peluciaLeituraInicial,
        pelucia_abastecido_inicial: peluciaAbastecidoInicial,

        endereco: validateTextField(req.body.endereco, 'Endereço', {
          min: 5,
          max: 100
        }).toUpperCase(),
        bairro: validateTextField(req.body.bairro, 'Bairro', {
          min: 2,
          max: 30
        }).toUpperCase(),
        responsavel_nome: validateTextField(
          req.body.responsavel_nome,
          'Responsável',
          {
            min: 2,
            max: 100
          }
        ).toUpperCase(),
        telefone_contato: validatePhone(req.body.telefone_contato),
        observacoes: getOptionalString(
          req.body.observacoes,
          'Comentários',
          255
        ).toUpperCase(),
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
      if (isValidationError(error)) {
        console.warn(
          'Validação bloqueou atualização de estabelecimento:',
          error.message
        );
      } else {
        console.error(
          'Erro ao atualizar o estabelecimento. Detalhes do erro:',
          error
        );
      }

      return res
        .status(isValidationError(error) ? 400 : 500)
        .render('pages/estabelecimentos/editarEstabelecimento', {
          title: 'Editar Estabelecimento',
          estabelecimento: {
            ...req.body,
            id: req.params.id
          },
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
          usuario,
          success: null,
          error: null
        });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);

      return res.status(500).send('Erro ao buscar estabelecimentos.');
    }
  };
}

export default new EstabelecimentoController();