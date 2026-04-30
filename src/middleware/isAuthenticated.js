import { getAuthCookieName, getClearAuthCookieOptions, verifyAuthToken } from '../utilities/authToken.js';

export const attachAuthenticatedUser = (req, res, next) => {
    const token = req.cookies?.[getAuthCookieName()];
    req.user = null;
    res.locals.usuario = null;

    if (!token) {
        return next();
    }

    try {
        const payload = verifyAuthToken(token);
        req.user = {
            id: payload.sub,
            user_id: payload.sub,
            username: payload.username,
            assinante_id: payload.assinante_id,
            status_assinatura: payload.status_assinatura
        };
        res.locals.usuario = req.user;
        return next();
    } catch (error) {
        res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
        return next();
    }
};

const isAuthenticated = (req, res, next) => {
    if (req.user) {
        return next();
    }

    if (req.xhr || req.get('accept')?.includes('application/json')) {
        return res.status(401).json({
            message: 'Sua sessao expirou. Faca login novamente.'
        });
    }

    return res.redirect('/login?erro=Por favor, faça login primeiro.');
};

export default isAuthenticated;
