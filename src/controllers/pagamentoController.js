import {
  getGatewayConfig,
  isGatewayConfigured
} from '../services/paymentGatewayService.js';

async function iniciarPagamento(req, res) {
  try {
    const gatewayConfig = getGatewayConfig();

    return res.status(200).json({
      success: true,
      message: 'Fluxo de pagamento preparado. Integração real ainda pendente.',
      provider: gatewayConfig.provider,
      environment: gatewayConfig.environment,
      gatewayConfigured: isGatewayConfigured()
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
  iniciarPagamento
};
