import assert from 'node:assert/strict';
import { normalizeAsaasWebhookPayload } from '../src/services/asaasWebhookNormalizerService.js';

const cases = [
  {
    name: 'pagamento confirmado com referencia externa e valor',
    payload: {
      id: 'evt_confirmed_1',
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_1',
        customer: 'cus_1',
        subscription: 'sub_1',
        status: 'RECEIVED',
        value: '149.90',
        billingType: 'PIX',
        externalReference: 'assinante:123',
        paymentDate: '2026-05-17'
      }
    },
    expected: {
      eventType: 'PAYMENT_RECEIVED',
      gatewayPaymentId: 'pay_1',
      gatewayCustomerId: 'cus_1',
      gatewaySubscriptionId: 'sub_1',
      paymentValue: 149.9,
      billingType: 'PIX',
      externalReference: 'assinante:123',
      isPaymentConfirmed: true,
      isPaymentOverdue: false,
      isPaymentDeleted: false,
      isSubscriptionCancelled: false
    }
  },
  {
    name: 'pagamento vencido nao ativa assinatura',
    payload: {
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: 'pay_overdue_1',
        status: 'OVERDUE',
        value: 99.9,
        externalReference: 'assinante:5'
      }
    },
    expected: {
      isPaymentConfirmed: false,
      isPaymentOverdue: true,
      isPaymentDeleted: false,
      isSubscriptionCancelled: false
    }
  },
  {
    name: 'cancelamento de assinatura fica separado de pagamento deletado',
    payload: {
      event: 'SUBSCRIPTION_DELETED',
      subscription: {
        id: 'sub_cancel_1',
        customer: 'cus_2',
        status: 'CANCELLED',
        externalReference: 'assinante:7'
      }
    },
    expected: {
      gatewaySubscriptionId: 'sub_cancel_1',
      gatewayCustomerId: 'cus_2',
      isPaymentConfirmed: false,
      isPaymentOverdue: false,
      isPaymentDeleted: false,
      isSubscriptionCancelled: true
    }
  },
  {
    name: 'valor invalido vira nulo e nao passa como pagamento valido',
    payload: {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_bad_value',
        status: 'CONFIRMED',
        value: 'abc',
        externalReference: 'assinante:9'
      }
    },
    expected: {
      paymentValue: null,
      isPaymentConfirmed: true
    }
  }
];

for (const testCase of cases) {
  const normalized = normalizeAsaasWebhookPayload(testCase.payload);

  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    assert.deepEqual(
      normalized[key],
      expectedValue,
      `${testCase.name}: campo ${key}`
    );
  }

  console.log(`[QA webhook] PASS ${testCase.name}`);
}

console.log(`[QA webhook] ${cases.length}/${cases.length} cenarios passaram.`);
