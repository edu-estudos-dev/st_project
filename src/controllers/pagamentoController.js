import AssinanteModel from '../models/assinanteModel.js';

import {
  getGatewayConfig,
  isGatewayConfigured
} from '../services/paymentGatewayService.js';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateBillingData(data) {
  const errors = [];

  const billingNome = normalizeText(data.billing_nome || data.nome);
  const billingCpfCnpj = onlyDigits(data.billing_cpf_cnpj || data.cpfCnpj || data.documento);
  const billingEmail = normalizeEmail(data.billing_email || data.email);
  const billingTelefone = onlyDigits(data.billing_telefone || data.telefone);

  if (!billingNome || billingNome.length < 2) {
    errors.push('Informe o nome ou razão social para cobrança.');
  }

  if (!billingCpfCnpj) {
    errors.push('Informe o CPF ou CNPJ para cobrança.');
  }

  if (billingCpfCnpj && ![11, 14].includes(billingCpfCnpj.length)) {
    errors.push('CPF/CNPJ deve ter 11 ou 14 dígitos.');
  }

  if (billingEmail && !billingEmail.includes('@')) {
    errors.push('Informe um e-mail de cobrança válido.');
  }

  if (billingTelefone && (billingTelefone.length < 10 || billingTelefone.length > 11)) {
    errors.push('Telefone de cobrança deve ter DDD e 10 ou 11 dígitos.');
  }

  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.statusCode = 400;
    throw error;
  }

  return {
    billing_nome: billingNome,
    billing_cpf_cnpj: billingCpfCnpj,
    billing_email: billingEmail || null,
    billing_telefone: billingTelefone || null
  };
}

function getAssinanteIdFromRequest(req) {
  return req.user?.assinante_id || req.user?.assinanteId || null;
}

async function obterDadosCobranca(req, res) {
  try {
    const assinanteId = getAssinanteIdFromRequest(req);

    if (!assinanteId) {
      return res.status(403).json({
        success: false,
        message: 'Assinante não identificado.'
      });
    }

    const assinante = await AssinanteModel.findById(assinanteId);

    if (!assinante) {
      return res.status(404).json({
        success: false,
        message: 'Assinante não encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      billingData: {
        billing_nome: assinante.billing_nome || '',
        billing_cpf_cnpj: assinante.billing_cpf_cnpj || '',
        billing_email: assinante.billing_email || '',
        billing_telefone: assinante.billing_telefone || ''
      }
    });
  } catch (error) {
    console.error('Erro ao obter dados de cobrança:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao obter dados de cobrança.'
    });
  }
}

async function salvarDadosCobranca(req, res) {
  try {
    const assinanteId = getAssinanteIdFromRequest(req);

    if (!assinanteId) {
      return res.status(403).json({
        success: false,
        message: 'Assinante não identificado.'
      });
    }

    const billingData = validateBillingData(req.body || {});
    const updatedBillingData = await AssinanteModel.updateBillingData(
      assinanteId,
      billingData
    );

    if (!updatedBillingData) {
      return res.status(404).json({
        success: false,
        message: 'Assinante não encontrado.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dados de cobrança salvos com sucesso.',
      billingData: updatedBillingData
    });
  } catch (error) {
    console.error('Erro ao salvar dados de cobrança:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Erro ao salvar dados de cobrança.'
    });
  }
}

async function iniciarPagamento(req, res) {
  try {
    const gatewayConfig = getGatewayConfig();
    const assinanteId = getAssinanteIdFromRequest(req);

    if (!assinanteId) {
      return res.status(403).json({
        success: false,
        message: 'Assinante não identificado.'
      });
    }

    const assinante = await AssinanteModel.findById(assinanteId);

    if (!assinante) {
      return res.status(404).json({
        success: false,
        message: 'Assinante não encontrado.'
      });
    }

    const hasBillingData = Boolean(
      assinante.billing_nome &&
      assinante.billing_cpf_cnpj
    );

    if (!hasBillingData) {
      return res.status(400).json({
        success: false,
        needsBillingData: true,
        message: 'Informe os dados de cobrança antes de iniciar o pagamento.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Fluxo de pagamento preparado. Integração real ainda pendente.',
      provider: gatewayConfig.provider,
      environment: gatewayConfig.environment,
      gatewayConfigured: isGatewayConfigured(),
      hasBillingData
    });
  } catch (error) {
    console.error('Erro ao iniciar pagamento:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao preparar fluxo de pagamento.'
    });
  }
}

export {
  obterDadosCobranca,
  salvarDadosCobranca,
  iniciarPagamento
};