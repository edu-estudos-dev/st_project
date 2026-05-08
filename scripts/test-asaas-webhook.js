import 'dotenv/config';

const DEFAULT_LOCAL_WEBHOOK_URL = 'http://localhost:8082/webhooks/asaas';

const webhookUrl = process.env.ASAAS_WEBHOOK_TEST_URL || DEFAULT_LOCAL_WEBHOOK_URL;
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

const eventId = process.argv[2] || `evt_test_${Date.now()}`;
const paymentId = process.argv[3] || `pay_test_${Date.now()}`;
const customerId = process.argv[4] || 'cus_test_gustavo_001';

if (!webhookToken) {
  console.error('Erro: ASAAS_WEBHOOK_TOKEN não está configurado no .env.');
  process.exit(1);
}

const payload = {
  id: eventId,
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: paymentId,
    status: 'RECEIVED',
    customer: customerId,
    paymentDate: new Date().toISOString()
  }
};

console.log('\nEnviando webhook fake do Asaas...');
console.log({
  webhookUrl,
  eventId,
  paymentId,
  customerId
});

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': webhookToken
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  console.log('\nResposta do webhook:');
  console.log('status:', response.status);
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    process.exit(1);
  }

  if (data?.duplicated) {
    console.log('\nResultado: evento duplicado detectado corretamente.');
    process.exit(0);
  }

  if (data?.processed) {
    console.log('\nResultado: pagamento confirmado processado com sucesso.');
    process.exit(0);
  }

  console.log('\nResultado: evento recebido, mas não processado como pagamento confirmado.');
  process.exit(0);
} catch (error) {
  console.error('\nErro ao enviar webhook fake:');
  console.error(error);
  process.exit(1);
}