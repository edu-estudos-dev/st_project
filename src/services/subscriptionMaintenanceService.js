import AssinanteModel from '../models/assinanteModel.js';

class SubscriptionMaintenanceService {
  async expireOverdueSubscriptions() {
    const expiredSubscriptions =
      await AssinanteModel.expireAllOverdueSubscriptionsForMaintenance();

    return {
      executedAt: new Date().toISOString(),
      expiredCount: expiredSubscriptions.length,
      expiredSubscriptions
    };
  }
}

export default new SubscriptionMaintenanceService();