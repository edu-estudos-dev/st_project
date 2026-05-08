import AssinanteModel from '../models/assinanteModel.js';

import {
  createCustomer,
  createSubscription,
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

function formatDateOnly(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
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

function getMonthlyPlanValue(assinante) {
  const value = Number(assinante?.valor_mensal || 0);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Valor mensal do plano não está configurado para este assinante.');
  }

  return Number(value.toFixed(2));
}

function buildAsaasCustomerPayload(assinante) {
  const billingTelefone = onlyDigits(assinante.billing_telefone);

  return {
    name: assinante.billing_nome,
    cpfCnpj: assinante.billing_cpf_cnpj,
    email: assinante.billing_email || undefined,
    mobilePhone: billingTelefone || undefined,
    externalReference: `assinante:${assinante.id}`,
    notificationDisabled: true,
    observations: `Cliente criado pelo VendMaster. Assinante interno #${assinante.id}.`
  };
}

function buildAsaasSubscriptionPayload(assinante, customerId) {
  const monthlyValue = getMonthlyPlanValue(assinante);
  const planName = assinante.plano_nome || 'Plano VendMaster';

  return {
    customer: customerId,
    billingType: 'BOLETO',
    value: monthlyValue,
    nextDueDate: formatDateOnly(new Date()),
    cycle: 'MONTHLY',
    description: `Assinatura VendMaster - ${planName}`,
    externalReference: `assinante:${assinante.id}`
  };
}

async function ensureAsaasCustomerForAssinante(assinante) {
  if (assinante.gateway_customer_id) {
    return {
      customerId: assinante.gateway_customer_id,
      created: false
    };
  }

  const customer = await createCustomer(buildAsaasCustomerPayload(assinante));

  if (!customer?.id) {
    throw new Error('Asaas não retornou o ID do customer criado.');
  }

  await AssinanteModel.updateGatewayCustomerId(assinante.id, customer.id);

  return {
    customerId: customer.id,
    created: true
  };
}

async function ensureAsaasSubscriptionForAssinante(assinante, customerId) {
  if (assinante.gateway_subscription_id) {
    return {
      subscriptionId: assinante.gateway_subscription_id,
      created: false
    };
  }

  const subscription = await createSubscription(
    buildAsaasSubscriptionPayload(assinante, customerId)
  );

  if (!subscription?.id) {
    throw new Error('Asaas não retornou o ID da assinatura criada.');
  }

  await AssinanteModel.updateGatewaySubscriptionId(assinante.id, subscription.id);

  return {
    subscriptionId: subscription.id,
    created: true,
    raw: subscription
  };
}

async function renderizarFormularioDadosCobranca(req, res) {
  try {
    const assinanteId = getAssinanteIdFromRequest(req);

    if (!assinanteId) {
      return res.redirect('/login?erro=Por%20favor,%20fa%C3%A7a%20login%20primeiro.');
    }

    const assinante = await AssinanteModel.findById(assinanteId);

    if (!assinante) {
      return res.status(404).render('pages/404', {
        title: 'Assinante não encontrado - VendMaster'
      });
    }

    return res.render('pages/pagamentos/dadosCobranca', {
      billingData: {
        billing_nome: assinante.billing_nome || '',
        billing_cpf_cnpj: assinante.billing_cpf_cnpj || '',
        billing_email: assinante.billing_email || '',
        billing_telefone: assinante.billing_telefone || ''
      },
      gatewayConfigured: isGatewayConfigured(),
      gatewayConfig: getGatewayConfig()
    });
  } catch (error) {
    console.error('Erro ao renderizar formulário de dados de cobrança:', error);

    return res.status(500).send('Erro ao carregar dados de cobrança.');
  }
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

    if (!isGatewayConfigured()) {
      return res.status(200).json({
        success: true,
        message: 'Dados de cobrança validados. Gateway ainda não configurado para criar customer real.',
        provider: gatewayConfig.provider,
        environment: gatewayConfig.environment,
        gatewayConfigured: false,
        hasBillingData,
        gatewayCustomerId: assinante.gateway_customer_id || null,
        gatewayCustomerCreated: false,
        gatewaySubscriptionId: assinante.gateway_subscription_id || null,
        gatewaySubscriptionCreated: false,
        needsGatewayConfiguration: true
      });
    }

    const customerResult = await ensureAsaasCustomerForAssinante(assinante);

    const assinanteComCustomer = {
      ...assinante,
      gateway_customer_id: customerResult.customerId
    };

    const subscriptionResult = await ensureAsaasSubscriptionForAssinante(
      assinanteComCustomer,
      customerResult.customerId
    );

    return res.status(200).json({
      success: true,
      message: subscriptionResult.created
        ? 'Assinatura criada no Asaas Sandbox. Próxima etapa: simular o pagamento.'
        : 'Assinatura já existente no Asaas. Próxima etapa: simular o pagamento.',
      provider: gatewayConfig.provider,
      environment: gatewayConfig.environment,
      gatewayConfigured: true,
      hasBillingData,
      gatewayCustomerId: customerResult.customerId,
      gatewayCustomerCreated: customerResult.created,
      gatewaySubscriptionId: subscriptionResult.subscriptionId,
      gatewaySubscriptionCreated: subscriptionResult.created,
      needsGatewayConfiguration: false
    });
  } catch (error) {
    console.error('Erro ao iniciar pagamento:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao preparar fluxo de pagamento.'
    });
  }
}

export {
  renderizarFormularioDadosCobranca,
  obterDadosCobranca,
  salvarDadosCobranca,
  iniciarPagamento
};