import { isSaasAdminUser } from '../utilities/saasAdmin.js';

const WRITABLE_STATUSES = new Set(['trial', 'ativo']);
const BLOCKED_STATUSES = new Set(['vencido', 'bloqueado', 'cancelado']);

const getSubscriptionStatus = (user) => {
  return user?.assinatura?.status_assinatura || user?.status_assinatura || null;
};

const forumPermissionService = {
  isAdmin(user) {
    return isSaasAdminUser(user);
  },

  canCreateTopic(user) {
    if (!user) {
      return false;
    }

    if (this.isAdmin(user)) {
      return true;
    }

    return WRITABLE_STATUSES.has(getSubscriptionStatus(user));
  },

  canReply(user) {
    return this.canCreateTopic(user);
  },

  getBlockedParticipationReason(user) {
    if (!user) {
      return {
        title: 'Entre para participar da comunidade',
        message:
          'Você pode ler os tópicos da Comunidade VendMaster livremente. Para criar tópicos ou responder, faça login na sua conta.'
      };
    }

    if (this.isAdmin(user)) {
      return null;
    }

    const status = getSubscriptionStatus(user);

    if (WRITABLE_STATUSES.has(status)) {
      return null;
    }

    if (BLOCKED_STATUSES.has(status)) {
      return {
        title: 'Regularize sua assinatura para participar',
        message:
          'Você ainda pode ler a Comunidade VendMaster, mas precisa regularizar sua assinatura para criar tópicos ou responder discussões.'
      };
    }

    return {
      title: 'Assinatura indisponível para participação',
      message:
        'Não foi possível confirmar uma assinatura ativa para permitir novas publicações na comunidade.'
    };
  }
};

export default forumPermissionService;