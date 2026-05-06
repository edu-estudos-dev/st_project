import { isSaasAdminUser } from '../utilities/saasAdmin.js';

const acceptsJson = req =>
  req.xhr ||
  req.get('x-requested-with') === 'XMLHttpRequest' ||
  req.get('accept')?.includes('application/json');

export const requireSaasAdmin = (req, res, next) => {
  if (!isSaasAdminUser(req.user)) {
    return res
      .status(403)
      .send('Acesso negado. Apenas o administrador pode acessar esta area.');
  }

  return next();
};
