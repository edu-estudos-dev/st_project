import 'dotenv/config';

import connection from '../src/db_config/connection.js';
import SubscriptionMaintenanceService from '../src/services/subscriptionMaintenanceService.js';

function formatRows(subscriptions) {
  return subscriptions.map(assinante => ({
    id: assinante.id,
    user_id: assinante.user_id,
    status: assinante.status_assinatura,
    plano: assinante.plano_nome,
    vencimento: assinante.data_vencimento,
    trial_fim: assinante.trial_fim
  }));
}

function printTable(title, subscriptions) {
  if (!subscriptions.length) {
    return;
  }

  console.log(`[assinaturas] ${title}:`);
  console.table(formatRows(subscriptions));
}

async function main() {
  console.log('[assinaturas] Iniciando rotina de manutenção...');

  const result = await SubscriptionMaintenanceService.expireOverdueSubscriptions();

  console.log('[assinaturas] Rotina finalizada.');
  console.log(`[assinaturas] Assinaturas vencidas atualizadas: ${result.expiredCount}`);
  console.log(`[assinaturas] Assinaturas bloqueadas atualizadas: ${result.blockedCount}`);
  console.log(`[assinaturas] Assinaturas canceladas atualizadas: ${result.cancelledCount}`);
  console.log(`[assinaturas] Total de assinaturas alteradas: ${result.totalChanged}`);

  printTable('Assinaturas marcadas como vencidas', result.expiredSubscriptions);
  printTable('Assinaturas marcadas como bloqueadas', result.blockedSubscriptions);
  printTable('Assinaturas marcadas como canceladas', result.cancelledSubscriptions);
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