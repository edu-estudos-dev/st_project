const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'asaas';

function getGatewayConfig() {
  return {
    provider: PAYMENT_PROVIDER,
    environment: process.env.PAYMENT_GATEWAY_ENV || 'sandbox',
    apiKey: process.env.ASAAS_API_KEY || '',
    baseUrl:
      process.env.PAYMENT_GATEWAY_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3'
  };
}

function isGatewayConfigured() {
  const config = getGatewayConfig();

  return Boolean(config.provider && config.environment && config.apiKey && config.baseUrl);
}

function ensureGatewayConfigured() {
  const config = getGatewayConfig();

  if (!config.apiKey) {
    throw new Error('Gateway de pagamento não configurado: ASAAS_API_KEY ausente.');
  }

  return config;
}

async function createCustomer() {
  throw new Error('createCustomer ainda não implementado. Integração real pendente.');
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
