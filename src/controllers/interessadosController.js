import { salvarContato } from '../models/interessadosModel.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizarProdutos = produtos => {
  if (Array.isArray(produtos)) {
    return produtos.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof produtos === 'string' && produtos.trim()) {
    return [produtos.trim()];
  }

  return [];
};

const interessadosController = {
  salvarContato: async (req, res) => {
    const nome = String(req.body?.nome || '').trim();
    const telefone = String(req.body?.telefone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const preferenciaContato = String(req.body?.preferenciaContato || '').trim();
    const produtos = normalizarProdutos(req.body?.produtos ?? req.body?.['produtos[]']);
    const telefoneNumerico = telefone.replace(/\D/g, '');

    if (!nome || !email || !telefone || produtos.length === 0) {
      return res.status(400).json({
        message: 'Preencha nome, telefone, e-mail e selecione ao menos um módulo.'
      });
    }

    if (telefoneNumerico.length < 10 || telefoneNumerico.length > 11) {
      return res.status(400).json({
        message: 'Informe um telefone válido com DDD.'
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Informe um e-mail válido para receber o retorno.'
      });
    }

    try {
      await salvarContato({ nome, telefone, email, produtos, preferenciaContato });

      return res.status(201).json({
        message: 'Recebemos seu interesse. Em breve nossa equipe vai entrar em contato.'
      });
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      return res.status(500).json({
        message: 'Nao foi possivel registrar seu contato agora. Tente novamente em instantes.'
      });
    }
  }
};

export default interessadosController;
