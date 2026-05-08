import AssinanteModel from '../models/assinanteModel.js';

class SubscriptionMaintenanceService {
  async expireOverdueSubscriptions() {
    const result =
      await AssinanteModel.expireAllOverdueSubscriptionsForMaintenance();

    const expiredCount = result.expiredSubscriptions.length;
    const blockedCount = result.blockedSubscriptions.length;
    const cancelledCount = result.cancelledSubscriptions.length;

    return {
      executedAt: new Date().toISOString(),
      expiredCount,
      blockedCount,
      cancelledCount,
      totalChanged: expiredCount + blockedCount + cancelledCount,
      expiredSubscriptions: result.expiredSubscriptions,
      blockedSubscriptions: result.blockedSubscriptions,
      cancelledSubscriptions: result.cancelledSubscriptions
    };
  }
}

export default new SubscriptionMaintenanceService();