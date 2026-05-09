const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'asaas';

const API_KEY_PLACEHOLDERS = new Set([
  '',
  'SUA_CHAVE_SANDBOX_DO_ASAAS',
  'SUA_CHAVE_REAL_SANDBOX_AQUI',
  'SUA_CHAVE_ASAAS',
  'ASAAS_API_KEY'
]);

const ALLOWED_PAYMENT_BILLING_TYPES = new Set([
  'BOLETO',
  'PIX',
  'CREDIT_CARD',
  'UNDEFINED'
]);

function getGatewayConfig() {
  const environment = process.env.PAYMENT_GATEWAY_ENV || 'sandbox';
  const apiKey = String(process.env.ASAAS_API_KEY || '').trim();

  return {
    provider: PAYMENT_PROVIDER,
    environment,
    apiKey,
    baseUrl:
      environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3'
  };
}

function hasValidApiKey(apiKey) {
  const normalizedApiKey = String(apiKey || '').trim();

  if (!normalizedApiKey) return false;
  if (API_KEY_PLACEHOLDERS.has(normalizedApiKey)) return false;

  return true;
}

function isGatewayConfigured() {
  const config = getGatewayConfig();

  return Boolean(
    config.provider &&
    config.environment &&
    hasValidApiKey(config.apiKey) &&
    config.baseUrl
  );
}

function ensureGatewayConfigured() {
  const config = getGatewayConfig();

  if (!hasValidApiKey(config.apiKey)) {
    throw new Error('Configuração de pagamento ausente ou inválida.');
  }

  return config;
}

function onlyFilledFields(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    })
  );
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatDateOnly(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizeMoneyValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return Number(numericValue.toFixed(2));
}

function normalizeBillingType(value, fallback = 'BOLETO') {
  const billingType = String(value || fallback).trim().toUpperCase();

  return ALLOWED_PAYMENT_BILLING_TYPES.has(billingType)
    ? billingType
    : fallback;
}

function validateCustomerData(customerData) {
  const errors = [];

  if (!customerData?.name || String(customerData.name).trim().length < 2) {
    errors.push('Nome do pagador é obrigatório.');
  }

  const cpfCnpj = normalizeDigits(customerData?.cpfCnpj);

  if (!cpfCnpj) {
    errors.push('CPF ou CNPJ do pagador é obrigatório.');
  }

  if (cpfCnpj && ![11, 14].includes(cpfCnpj.length)) {
    errors.push('CPF/CNPJ deve ter 11 ou 14 dígitos.');
  }

  if (errors.length) {
    throw new Error(`Dados inválidos para cadastro de cobrança: ${errors.join(' ')}`);
  }

  return {
    ...customerData,
    name: String(customerData.name).trim(),
    cpfCnpj
  };
}

function validateSubscriptionData(subscriptionData) {
  const errors = [];

  const value = normalizeMoneyValue(subscriptionData?.value);

  if (!subscriptionData?.customer) {
    errors.push('Identificador do pagador é obrigatório para criar a assinatura.');
  }

  if (!value) {
    errors.push('Valor mensal da assinatura é obrigatório.');
  }

  if (errors.length) {
    throw new Error(`Dados inválidos para criar assinatura: ${errors.join(' ')}`);
  }

  return {
    ...subscriptionData,
    customer: String(subscriptionData.customer).trim(),
    value,
    billingType: normalizeBillingType(subscriptionData.billingType, 'BOLETO'),
    cycle: subscriptionData.cycle || 'MONTHLY',
    nextDueDate: formatDateOnly(subscriptionData.nextDueDate || new Date())
  };
}

function validatePaymentData(paymentData) {
  const errors = [];

  const value = normalizeMoneyValue(paymentData?.value);
  const billingType = normalizeBillingType(paymentData?.billingType, 'BOLETO');

  if (!paymentData?.customer) {
    errors.push('Identificador do pagador é obrigatório para criar a cobrança.');
  }

  if (!value) {
    errors.push('Valor da cobrança é obrigatório.');
  }

  if (errors.length) {
    throw new Error(`Dados inválidos para criar cobrança: ${errors.join(' ')}`);
  }

  return {
    ...paymentData,
    customer: String(paymentData.customer).trim(),
    billingType,
    value,
    dueDate: formatDateOnly(paymentData.dueDate || new Date())
  };
}

async function requestAsaas({ method, path, body }) {
  const config = ensureGatewayConfigured();

  if (config.provider !== 'asaas') {
    throw new Error(`Provedor de pagamento não suportado: ${config.provider}`);
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'VendMaster/1.0 (Node.js)',
      access_token: config.apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { raw: responseText };
    }
  }

  if (!response.ok) {
    const details = responseBody?.errors
      ? JSON.stringify(responseBody.errors)
      : JSON.stringify(responseBody);

    throw new Error(
      `Erro no provedor de pagamento (${response.status}): ${details || 'sem detalhes'}`
    );
  }

  return responseBody;
}

async function createCustomer(customerData = {}) {
  const validatedCustomer = validateCustomerData(customerData);

  const payload = onlyFilledFields({
    name: validatedCustomer.name,
    cpfCnpj: validatedCustomer.cpfCnpj,
    email: validatedCustomer.email,
    phone: validatedCustomer.phone,
    mobilePhone: validatedCustomer.mobilePhone,
    externalReference: validatedCustomer.externalReference,
    notificationDisabled: validatedCustomer.notificationDisabled ?? true,
    observations: validatedCustomer.observations
  });

  return requestAsaas({
    method: 'POST',
    path: '/customers',
    body: payload
  });
}

async function createSubscription(subscriptionData = {}) {
  const validatedSubscription = validateSubscriptionData(subscriptionData);

  const payload = onlyFilledFields({
    customer: validatedSubscription.customer,
    billingType: validatedSubscription.billingType,
    value: validatedSubscription.value,
    nextDueDate: validatedSubscription.nextDueDate,
    cycle: validatedSubscription.cycle,
    description: validatedSubscription.description,
    externalReference: validatedSubscription.externalReference,
    fine: validatedSubscription.fine,
    interest: validatedSubscription.interest
  });

  return requestAsaas({
    method: 'POST',
    path: '/subscriptions',
    body: payload
  });
}

async function createPayment(paymentData = {}) {
  const validatedPayment = validatePaymentData(paymentData);

  const payload = onlyFilledFields({
    customer: validatedPayment.customer,
    billingType: validatedPayment.billingType,
    value: validatedPayment.value,
    dueDate: validatedPayment.dueDate,
    description: validatedPayment.description,
    externalReference: validatedPayment.externalReference,
    fine: validatedPayment.fine,
    interest: validatedPayment.interest,
    discount: validatedPayment.discount
  });

  return requestAsaas({
    method: 'POST',
    path: '/payments',
    body: payload
  });
}

async function getPixQrCode(paymentId) {
  const normalizedPaymentId = String(paymentId || '').trim();

  if (!normalizedPaymentId) {
    throw new Error('ID da cobrança é obrigatório para buscar QR Code Pix.');
  }

  return requestAsaas({
    method: 'GET',
    path: `/payments/${encodeURIComponent(normalizedPaymentId)}/pixQrCode`
  });
}

async function getSubscriptionPayments(subscriptionId, limit = 10) {
  const normalizedSubscriptionId = String(subscriptionId || '').trim();

  if (!normalizedSubscriptionId) {
    throw new Error('ID da assinatura é obrigatório para buscar cobranças.');
  }

  const normalizedLimit = Number.isInteger(Number(limit))
    ? Math.max(1, Math.min(Number(limit), 100))
    : 10;

  return requestAsaas({
    method: 'GET',
    path: `/payments?subscription=${encodeURIComponent(normalizedSubscriptionId)}&limit=${normalizedLimit}`
  });
}

async function createPaymentLink() {
  throw new Error('Link de pagamento ainda não disponível neste fluxo.');
}

export {
  getGatewayConfig,
  isGatewayConfigured,
  ensureGatewayConfigured,
  createCustomer,
  createSubscription,
  createPayment,
  getPixQrCode,
  getSubscriptionPayments,
  createPaymentLink
};