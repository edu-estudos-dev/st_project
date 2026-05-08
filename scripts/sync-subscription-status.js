import 'dotenv/config';

import connection from '../src/db_config/connection.js';
import SubscriptionMaintenanceService from '../src/services/subscriptionMaintenanceService.js';

async function main() {
  console.log('[assinaturas] Iniciando rotina de manutenção...');

  const result = await SubscriptionMaintenanceService.expireOverdueSubscriptions();

  console.log('[assinaturas] Rotina finalizada.');
  console.log(`[assinaturas] Assinaturas vencidas atualizadas: ${result.expiredCount}`);

  if (result.expiredSubscriptions.length > 0) {
    console.table(
      result.expiredSubscriptions.map(assinante => ({
        id: assinante.id,
        user_id: assinante.user_id,
        status: assinante.status_assinatura,
        plano: assinante.plano_nome,
        vencimento: assinante.data_vencimento,
        trial_fim: assinante.trial_fim
      }))
    );
  }
}

main()
  .catch(error => {
    console.error('[assinaturas] Erro ao executar rotina de manutenção:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (typeof connection.end === 'function') {
      await connection.end();
    }
  });