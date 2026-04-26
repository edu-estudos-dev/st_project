const parseAdminUserIds = () => {
  const configured = String(process.env.SAAS_ADMIN_USER_IDS || '1')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return configured.length ? configured : [1];
};

export const getSaasAdminUserIds = () => parseAdminUserIds();

export const isSaasAdminUser = (user) => {
  const userId = Number(user?.user_id || user?.id || user?.sub || 0);
  return getSaasAdminUserIds().includes(userId);
};
