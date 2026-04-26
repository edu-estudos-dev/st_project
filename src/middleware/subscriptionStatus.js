import AssinanteModel from '../models/assinanteModel.js';
import { getAuthCookieName, getClearAuthCookieOptions } from '../utilities/authToken.js';
import { isSaasAdminUser } from '../utilities/saasAdmin.js';

const FULL_ACCESS_STATUSES = new Set(['trial', 'ativo']);
const READ_ACCESS_STATUSES = new Set(['trial', 'ativo', 'vencido', 'cancelado']);

const isJsonRequest = (req) => {
    return req.xhr
        || req.get('x-requested-with') === 'XMLHttpRequest'
        || req.get('accept')?.includes('application/json');
};

const deny = (req, res, statusCode, message, redirectPath = '/painel', clearAuthCookie = false) => {
    if (clearAuthCookie) {
        res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
    }

    if (isJsonRequest(req)) {
        return res.status(statusCode).json({ message });
    }

    const separator = redirectPath.includes('?') ? '&' : '?';
    return res.redirect(`${redirectPath}${separator}error=${encodeURIComponent(message)}`);
};

export const attachSubscriptionStatus = async (req, res, next) => {
    if (!req.user?.assinante_id) {
        res.locals.isSaasAdmin = isSaasAdminUser(req.user);
        return next();
    }

    try {
        const assinante = await AssinanteModel.findById(req.user.assinante_id);

        if (!assinante) {
            req.user.status_assinatura = null;
            req.user.assinatura = null;
            res.locals.usuario = req.user;
            res.locals.isSaasAdmin = isSaasAdminUser(req.user);
            res.locals.assinaturaSomenteLeitura = false;
            return next();
        }

        req.user.status_assinatura = assinante.status_assinatura;
        req.user.assinatura = assinante;
        res.locals.usuario = req.user;
        res.locals.assinante = assinante;
        res.locals.isSaasAdmin = isSaasAdminUser(req.user);
        res.locals.assinaturaSomenteLeitura = !FULL_ACCESS_STATUSES.has(assinante.status_assinatura);

        return next();
    } catch (error) {
        console.error('Erro ao carregar status da assinatura:', error);
        return res.status(500).send('Erro ao validar assinatura.');
    }
};

export const requireReadableSubscription = (req, res, next) => {
    const status = req.user?.status_assinatura;

    if (READ_ACCESS_STATUSES.has(status)) {
        return next();
    }

    if (status === 'bloqueado') {
        return deny(req, res, 403, 'Assinatura bloqueada. Entre em contato com o suporte.', '/login', true);
    }

    return deny(req, res, 403, 'Assinatura indisponivel. Entre em contato com o suporte.', '/login', true);
};

export const requireWritableSubscription = (req, res, next) => {
    const status = req.user?.status_assinatura;

    if (FULL_ACCESS_STATUSES.has(status)) {
        return next();
    }

    if (READ_ACCESS_STATUSES.has(status)) {
        return deny(req, res, 403, 'Assinatura em modo somente leitura. Regularize para alterar dados.');
    }

    return requireReadableSubscription(req, res, next);
};
