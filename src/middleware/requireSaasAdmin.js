import { isSaasAdminUser } from '../utilities/saasAdmin.js';

const acceptsJson = req =>
  req.xhr ||
  req.get('x-requested-with') === 'XMLHttpRequest' ||
  req.get('accept')?.includes('application/json');

export const requireSaasAdmin = (req, res, next) => {
  console.log('REQ.USER NO ADMIN:', req.user);

  const userId = Number(req.user?.user_id || req.user?.id);

  if (userId !== 1) {
    return res
      .status(403)
      .send('Acesso negado. Apenas o administrador pode acessar esta area.');
  }

  return next();
};
