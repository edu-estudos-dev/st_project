const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'asaas';

const API_KEY_PLACEHOLDERS = new Set([
  '',
  'SUA_CHAVE_SANDBOX_DO_ASAAS',
  'SUA_CHAVE_REAL_SANDBOX_AQUI',
  'SUA_CHAVE_ASAAS',
  'ASAAS_API_KEY'
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
    throw new Error('Gateway de pagamento não configurado: ASAAS_API_KEY ausente ou inválida.');
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

function validateCustomerData(customerData) {
  const errors = [];

  if (!customerData?.name || String(customerData.name).trim().length < 2) {
    errors.push('Nome do cliente é obrigatório.');
  }

  const cpfCnpj = normalizeDigits(customerData?.cpfCnpj);

  if (!cpfCnpj) {
    errors.push('CPF ou CNPJ do cliente é obrigatório.');
  }

  if (cpfCnpj && ![11, 14].includes(cpfCnpj.length)) {
    errors.push('CPF/CNPJ deve ter 11 ou 14 dígitos.');
  }

  if (errors.length) {
    throw new Error(`Dados inválidos para criar customer no Asaas: ${errors.join(' ')}`);
  }

  return {
    ...customerData,
    name: String(customerData.name).trim(),
    cpfCnpj
  };
}

async function requestAsaas({ method, path, body }) {
  const config = ensureGatewayConfigured();

  if (config.provider !== 'asaas') {
    throw new Error(`Provider de pagamento não suportado: ${config.provider}`);
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
      `Erro na API do Asaas (${response.status}): ${details || 'sem detalhes'}`
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

async function createSubscription() {
  throw new Error('createSubscription ainda não implementado. Integração real pendente.');
}

async function createPaymentLink() {
  throw new Error('createPaymentLink ainda não implementado. Integração real pendente.');
}

export {
  getGatewayConfig,
  isGatewayConfigured,
  ensureGatewayConfigured,
  createCustomer,
  createSubscription,
  createPaymentLink
};