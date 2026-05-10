import AssinanteModel from '../models/assinanteModel.js';

import {
  createCustomer,
  createPayment,
  createSubscription,
  deletePayment,
  deleteSubscription,
  getCustomerPayments,
  getGatewayConfig,
  getSubscriptionPayments,
  isGatewayConfigured
} from '../services/paymentGatewayService.js';

const ALLOWED_BILLING_TYPES = new Set(['BOLETO', 'PIX', 'CREDIT_CARD']);
const ACTIVE_BILLING_TYPES = new Set(['BOLETO', 'CREDIT_CARD']);

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeBillingType(value) {
  const billingType = String(value || 'CREDIT_CARD')
    .trim()
    .toUpperCase();

  return ALLOWED_BILLING_TYPES.has(billingType) ? billingType : 'CREDIT_CARD';
}

function isPixBillingType(billingType) {
  return billingType === 'PIX';
}

function isActiveBillingType(billingType) {
  return ACTIVE_BILLING_TYPES.has(billingType);
}

function getBillingTypeLabel(billingType) {
  const labels = {
    BOLETO: 'boleto',
    CREDIT_CARD: 'cartão'
  };

  return labels[billingType] || 'forma de pagamento';
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
  const billingCpfCnpj = onlyDigits(
    data.billing_cpf_cnpj || data.cpfCnpj || data.documento
  );
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

  if (
    billingTelefone &&
    (billingTelefone.length < 10 || billingTelefone.length > 11)
  ) {
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
    throw new Error(
      'Valor mensal do plano não está configurado para este assinante.'
    );
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

function buildAsaasCreditCardPaymentPayload(assinante, customerId) {
  const monthlyValue = getMonthlyPlanValue(assinante);
  const planName = assinante.plano_nome || 'Plano VendMaster';

  return {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: monthlyValue,
    dueDate: formatDateOnly(new Date()),
    description: `Regularização VendMaster via cartão de crédito - ${planName}`,
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
    throw new Error('Provedor de pagamento não retornou o ID do cliente criado.');
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
    throw new Error('Provedor de pagamento não retornou o ID da assinatura criada.');
  }

  await AssinanteModel.updateGatewaySubscriptionId(
    assinante.id,
    subscription.id
  );

  return {
    subscriptionId: subscription.id,
    created: true,
    raw: subscription
  };
}

function selectBestPaymentForSubscription(payments = []) {
  if (!Array.isArray(payments) || !payments.length) {
    return null;
  }

  const priority = {
    PENDING: 1,
    OVERDUE: 2,
    CONFIRMED: 3,
    RECEIVED: 4
  };

  return [...payments].sort((a, b) => {
    const priorityA = priority[a?.status] || 99;
    const priorityB = priority[b?.status] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const dateA = new Date(a?.dueDate || a?.dateCreated || 0).getTime();
    const dateB = new Date(b?.dueDate || b?.dateCreated || 0).getTime();

    return dateB - dateA;
  })[0];
}

function buildPaymentResponse(payment) {
  if (!payment) {
    return null;
  }

  const paymentUrl = payment.invoiceUrl || payment.bankSlipUrl || null;

  return {
    id: payment.id || null,
    status: payment.status || null,
    billingType: payment.billingType || null,
    value: payment.value ?? null,
    dueDate: payment.dueDate || null,
    invoiceUrl: payment.invoiceUrl || null,
    bankSlipUrl: payment.bankSlipUrl || null,
    transactionReceiptUrl: payment.transactionReceiptUrl || null,
    deleted: payment.deleted === true,
    paymentUrl
  };
}

function isSameMoneyValue(firstValue, secondValue) {
  const first = Number(firstValue);
  const second = Number(secondValue);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return false;
  }

  return first.toFixed(2) === second.toFixed(2);
}

function getPaymentDateScore(payment) {
  return new Date(
    payment?.dateCreated ||
      payment?.dueDate ||
      payment?.createdDate ||
      0
  ).getTime();
}

function isReusablePendingPayment(payment, assinante) {
  const expectedExternalReference = `assinante:${assinante.id}`;
  const expectedValue = getMonthlyPlanValue(assinante);

  return (
    payment?.deleted !== true &&
    payment?.status === 'PENDING' &&
    payment?.externalReference === expectedExternalReference &&
    isSameMoneyValue(payment?.value, expectedValue) &&
    Boolean(payment?.invoiceUrl || payment?.bankSlipUrl)
  );
}

function selectReusablePendingPayment(payments = [], assinante) {
  if (!Array.isArray(payments) || !payments.length) {
    return null;
  }

  const reusablePayments = payments.filter((payment) => {
    return isReusablePendingPayment(payment, assinante);
  });

  if (!reusablePayments.length) {
    return null;
  }

  return reusablePayments.sort((a, b) => {
    return getPaymentDateScore(b) - getPaymentDateScore(a);
  })[0];
}

function selectReusableCreditCardPayment(payments = [], assinante) {
  if (!Array.isArray(payments) || !payments.length) {
    return null;
  }

  const reusablePayments = payments.filter((payment) => {
    return (
      payment?.billingType === 'CREDIT_CARD' &&
      isReusablePendingPayment(payment, assinante) &&
      Boolean(payment?.invoiceUrl)
    );
  });

  if (!reusablePayments.length) {
    return null;
  }

  return reusablePayments.sort((a, b) => {
    return getPaymentDateScore(b) - getPaymentDateScore(a);
  })[0];
}

async function findReusablePendingPayment(assinante, customerId) {
  const paymentsResult = await getCustomerPayments(customerId, 50);

  return selectReusablePendingPayment(paymentsResult?.data || [], assinante);
}

async function findReusableCreditCardPayment(assinante, customerId) {
  const paymentsResult = await getCustomerPayments(customerId, 50);

  return selectReusableCreditCardPayment(paymentsResult?.data || [], assinante);
}

async function cancelarPagamentoPendenteAtual(assinante, pendingPayment) {
  if (!pendingPayment?.id) {
    throw new Error('Nenhuma cobrança em aberto foi localizada para troca.');
  }

  const paymentBillingType = pendingPayment.billingType || null;
  const paymentSubscriptionId =
    pendingPayment.subscription ||
    pendingPayment.gatewaySubscriptionId ||
    pendingPayment.gateway_subscription_id ||
    null;

  let deletedSubscription = null;
  let deletedPayment = null;
  let clearedSubscriptionReference = false;

  if (paymentSubscriptionId) {
    deletedSubscription = await deleteSubscription(paymentSubscriptionId);

    if (assinante.gateway_subscription_id === paymentSubscriptionId) {
      await AssinanteModel.updateFromAdmin(assinante.id, { gateway_subscription_id: null });
      clearedSubscriptionReference = true;
    }

    return {
      previousBillingType: paymentBillingType,
      previousPaymentId: pendingPayment.id,
      previousSubscriptionId: paymentSubscriptionId,
      deletedSubscription,
      deletedPayment: null,
      clearedSubscriptionReference
    };
  }

  deletedPayment = await deletePayment(pendingPayment.id);

  return {
    previousBillingType: paymentBillingType,
    previousPaymentId: pendingPayment.id,
    previousSubscriptionId: null,
    deletedSubscription: null,
    deletedPayment,
    clearedSubscriptionReference
  };
}

function buildPaymentConflictResponse({
  assinante,
  customerResult,
  hasBillingData,
  requestedBillingType,
  reusablePendingPayment
}) {
  const payment = buildPaymentResponse(reusablePendingPayment);
  const currentMethodLabel = getBillingTypeLabel(reusablePendingPayment.billingType);
  const requestedMethodLabel = getBillingTypeLabel(requestedBillingType);

  return {
    success: false,
    message: `Já existe uma cobrança por ${currentMethodLabel} em aberto. Você pode concluir essa cobrança ou trocar para ${requestedMethodLabel}.`,
    conflictReason: 'PENDING_PAYMENT_DIFFERENT_METHOD',
    canSwitchPaymentMethod: true,
    hasBillingData,
    requestedBillingType,
    requestedBillingTypeLabel: requestedMethodLabel,
    effectiveBillingType: reusablePendingPayment.billingType,
    currentBillingType: reusablePendingPayment.billingType,
    currentBillingTypeLabel: currentMethodLabel,
    gatewayCustomerId: customerResult.customerId,
    gatewayCustomerCreated: customerResult.created,
    gatewaySubscriptionId: assinante.gateway_subscription_id || null,
    gatewaySubscriptionCreated: false,
    gatewayPaymentReused: true,
    needsGatewayConfiguration: false,
    payment,
    pix: null
  };
}

async function prepararPagamentoBoleto({
  assinante,
  customerResult,
  hasBillingData,
  gatewayConfig
}) {
  const assinanteComCustomer = {
    ...assinante,
    gateway_customer_id: customerResult.customerId
  };

  const subscriptionResult = await ensureAsaasSubscriptionForAssinante(
    assinanteComCustomer,
    customerResult.customerId
  );

  const paymentsResult = await getSubscriptionPayments(
    subscriptionResult.subscriptionId,
    10
  );

  const selectedPayment = selectBestPaymentForSubscription(
    paymentsResult?.data || []
  );
  const payment = buildPaymentResponse(selectedPayment);

  return {
    success: true,
    message: payment?.paymentUrl
      ? 'Boleto preparado com sucesso. Abra a cobrança para concluir a regularização.'
      : 'Assinatura preparada com sucesso, mas nenhuma cobrança aberta foi localizada no momento.',
    provider: gatewayConfig.provider,
    environment: gatewayConfig.environment,
    gatewayConfigured: true,
    hasBillingData,
    requestedBillingType: 'BOLETO',
    effectiveBillingType: 'BOLETO',
    gatewayCustomerId: customerResult.customerId,
    gatewayCustomerCreated: customerResult.created,
    gatewaySubscriptionId: subscriptionResult.subscriptionId,
    gatewaySubscriptionCreated: subscriptionResult.created,
    needsGatewayConfiguration: false,
    payment,
    pix: null
  };
}

async function prepararPagamentoCartao({
  assinante,
  customerResult,
  hasBillingData,
  gatewayConfig
}) {
  const reusableCreditCardPayment = await findReusableCreditCardPayment(
    assinante,
    customerResult.customerId
  );

  const creditCardPayment =
    reusableCreditCardPayment ||
    (await createPayment(
      buildAsaasCreditCardPaymentPayload(assinante, customerResult.customerId)
    ));

  if (!creditCardPayment?.id) {
    throw new Error('Provedor de pagamento não retornou o ID da cobrança por cartão criada.');
  }

  const payment = buildPaymentResponse(creditCardPayment);
  const paymentWasReused = Boolean(reusableCreditCardPayment?.id);

  return {
    success: true,
    message: paymentWasReused
      ? 'Encontramos uma cobrança por cartão já aberta. Abra a página segura para concluir a regularização.'
      : payment?.paymentUrl
        ? 'Cobrança por cartão preparada com sucesso. Abra a página segura para informar os dados do cartão.'
        : 'Cobrança por cartão criada, mas nenhum link de pagamento foi retornado no momento.',
    provider: gatewayConfig.provider,
    environment: gatewayConfig.environment,
    gatewayConfigured: true,
    hasBillingData,
    requestedBillingType: 'CREDIT_CARD',
    effectiveBillingType: 'CREDIT_CARD',
    gatewayCustomerId: customerResult.customerId,
    gatewayCustomerCreated: customerResult.created,
    gatewaySubscriptionId: assinante.gateway_subscription_id || null,
    gatewaySubscriptionCreated: false,
    gatewayPaymentReused: paymentWasReused,
    needsGatewayConfiguration: false,
    payment,
    pix: null
  };
}

async function prepararPagamentoPorTipo({
  assinante,
  customerResult,
  hasBillingData,
  gatewayConfig,
  requestedBillingType
}) {
  if (requestedBillingType === 'CREDIT_CARD') {
    return prepararPagamentoCartao({
      assinante,
      customerResult,
      hasBillingData,
      gatewayConfig
    });
  }

  return prepararPagamentoBoleto({
    assinante,
    customerResult,
    hasBillingData,
    gatewayConfig
  });
}

async function renderizarFormularioDadosCobranca(req, res) {
  try {
    const assinanteId = getAssinanteIdFromRequest(req);

    if (!assinanteId) {
      return res.redirect(
        '/login?erro=Por%20favor,%20fa%C3%A7a%20login%20primeiro.'
      );
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
    const requestedBillingType = normalizeBillingType(req.body?.billingType);

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
      assinante.billing_nome && assinante.billing_cpf_cnpj
    );

    if (!hasBillingData) {
      return res.status(400).json({
        success: false,
        needsBillingData: true,
        message: 'Informe os dados de cobrança antes de iniciar o pagamento.'
      });
    }

    if (isPixBillingType(requestedBillingType)) {
      return res.status(400).json({
        success: false,
        message:
          'Pix para assinatura estará disponível em breve. Por enquanto, escolha cartão de crédito ou boleto.',
        pixComingSoon: true,
        hasBillingData,
        requestedBillingType,
        effectiveBillingType: null,
        gatewayCustomerId: assinante.gateway_customer_id || null,
        gatewayCustomerCreated: false,
        gatewaySubscriptionId: assinante.gateway_subscription_id || null,
        gatewaySubscriptionCreated: false,
        needsGatewayConfiguration: false,
        payment: null,
        pix: null
      });
    }

    if (!isActiveBillingType(requestedBillingType)) {
      return res.status(400).json({
        success: false,
        message: 'Forma de pagamento inválida. Escolha cartão de crédito ou boleto.',
        hasBillingData,
        requestedBillingType,
        effectiveBillingType: null,
        gatewayCustomerId: assinante.gateway_customer_id || null,
        gatewayCustomerCreated: false,
        gatewaySubscriptionId: assinante.gateway_subscription_id || null,
        gatewaySubscriptionCreated: false,
        needsGatewayConfiguration: false,
        payment: null,
        pix: null
      });
    }

    if (!isGatewayConfigured()) {
      return res.status(200).json({
        success: true,
        message:
          'Dados de cobrança validados. A cobrança ainda não está disponível para esta assinatura.',
        provider: gatewayConfig.provider,
        environment: gatewayConfig.environment,
        gatewayConfigured: false,
        hasBillingData,
        requestedBillingType,
        gatewayCustomerId: assinante.gateway_customer_id || null,
        gatewayCustomerCreated: false,
        gatewaySubscriptionId: assinante.gateway_subscription_id || null,
        gatewaySubscriptionCreated: false,
        needsGatewayConfiguration: true,
        payment: null,
        pix: null
      });
    }

    const customerResult = await ensureAsaasCustomerForAssinante(assinante);
    const reusablePendingPayment = await findReusablePendingPayment(
      assinante,
      customerResult.customerId
    );

    if (
      reusablePendingPayment?.id &&
      reusablePendingPayment.billingType &&
      reusablePendingPayment.billingType !== requestedBillingType
    ) {
      const responsePayload = buildPaymentConflictResponse({
        assinante,
        customerResult,
        hasBillingData,
        requestedBillingType,
        reusablePendingPayment
      });

      return res.status(409).json(responsePayload);
    }

    const responsePayload = await prepararPagamentoPorTipo({
      assinante,
      customerResult,
      hasBillingData,
      gatewayConfig,
      requestedBillingType
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro ao iniciar pagamento:', error);

    return res.status(500).json({
      success: false,
      message: 'Não foi possível preparar o pagamento. Tente novamente em alguns instantes.'
    });
  }
}

async function trocarFormaPagamento(req, res) {
  try {
    const gatewayConfig = getGatewayConfig();
    const assinanteId = getAssinanteIdFromRequest(req);
    const requestedBillingType = normalizeBillingType(req.body?.billingType);

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
      assinante.billing_nome && assinante.billing_cpf_cnpj
    );

    if (!hasBillingData) {
      return res.status(400).json({
        success: false,
        needsBillingData: true,
        message: 'Informe os dados de cobrança antes de trocar a forma de pagamento.'
      });
    }

    if (isPixBillingType(requestedBillingType)) {
      return res.status(400).json({
        success: false,
        message:
          'Pix para assinatura estará disponível em breve. Por enquanto, escolha cartão de crédito ou boleto.',
        pixComingSoon: true,
        hasBillingData,
        requestedBillingType,
        effectiveBillingType: null,
        payment: null,
        pix: null
      });
    }

    if (!isActiveBillingType(requestedBillingType)) {
      return res.status(400).json({
        success: false,
        message: 'Forma de pagamento inválida. Escolha cartão de crédito ou boleto.',
        hasBillingData,
        requestedBillingType,
        effectiveBillingType: null,
        payment: null,
        pix: null
      });
    }

    if (!isGatewayConfigured()) {
      return res.status(400).json({
        success: false,
        message:
          'A cobrança ainda não está disponível para esta assinatura. Entre em contato com o suporte.',
        hasBillingData,
        requestedBillingType,
        needsGatewayConfiguration: true,
        payment: null,
        pix: null
      });
    }

    const customerResult = await ensureAsaasCustomerForAssinante(assinante);
    const reusablePendingPayment = await findReusablePendingPayment(
      assinante,
      customerResult.customerId
    );

    if (!reusablePendingPayment?.id) {
      const responsePayload = await prepararPagamentoPorTipo({
        assinante,
        customerResult,
        hasBillingData,
        gatewayConfig,
        requestedBillingType
      });

      return res.status(200).json({
        ...responsePayload,
        switchedPaymentMethod: false,
        message:
          responsePayload.message ||
          'Nenhuma cobrança anterior foi localizada. Uma nova cobrança foi preparada.'
      });
    }

    if (reusablePendingPayment.billingType === requestedBillingType) {
      return res.status(409).json({
        success: false,
        message: `Já existe uma cobrança por ${getBillingTypeLabel(requestedBillingType)} em aberto. Abra a cobrança atual para concluir o pagamento.`,
        conflictReason: 'PENDING_PAYMENT_SAME_METHOD',
        canSwitchPaymentMethod: false,
        hasBillingData,
        requestedBillingType,
        effectiveBillingType: reusablePendingPayment.billingType,
        currentBillingType: reusablePendingPayment.billingType,
        currentBillingTypeLabel: getBillingTypeLabel(reusablePendingPayment.billingType),
        payment: buildPaymentResponse(reusablePendingPayment),
        pix: null
      });
    }

    const cancellationResult = await cancelarPagamentoPendenteAtual(
      assinante,
      reusablePendingPayment
    );

    const updatedAssinante = await AssinanteModel.findById(assinante.id);

    const responsePayload = await prepararPagamentoPorTipo({
      assinante: updatedAssinante || {
        ...assinante,
        gateway_subscription_id: null
      },
      customerResult,
      hasBillingData,
      gatewayConfig,
      requestedBillingType
    });

    return res.status(200).json({
      ...responsePayload,
      switchedPaymentMethod: true,
      previousBillingType: cancellationResult.previousBillingType,
      previousBillingTypeLabel: getBillingTypeLabel(cancellationResult.previousBillingType),
      previousPaymentId: cancellationResult.previousPaymentId,
      previousSubscriptionId: cancellationResult.previousSubscriptionId,
      message: responsePayload.payment?.paymentUrl
        ? `Forma de pagamento alterada com sucesso. A cobrança por ${getBillingTypeLabel(cancellationResult.previousBillingType)} foi cancelada e a nova cobrança por ${getBillingTypeLabel(requestedBillingType)} está pronta.`
        : `Forma de pagamento alterada com sucesso. A cobrança anterior foi cancelada, mas nenhum link de pagamento foi localizado no momento.`
    });
  } catch (error) {
    console.error('Erro ao trocar forma de pagamento:', error);

    return res.status(500).json({
      success: false,
      message: 'Não foi possível trocar a forma de pagamento. Tente novamente em alguns instantes.'
    });
  }
}

export {
  renderizarFormularioDadosCobranca,
  obterDadosCobranca,
  salvarDadosCobranca,
  iniciarPagamento,
  trocarFormaPagamento
};