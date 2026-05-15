import { getAuthCookieName, getClearAuthCookieOptions, verifyAuthToken } from '../utilities/authToken.js';
import connection from '../db_config/connection.js';

const findSessionUser = async (userId) => {
    const result = await connection.query(
        `SELECT
            u.id,
            u.username,
            u.auth_provider,
            a.id AS assinante_id,
            a.status_assinatura
         FROM users u
         INNER JOIN assinantes a ON a.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
    );

    return result.rows?.[0] || null;
};

const clearInvalidSession = (res) => {
    res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
};

export const attachAuthenticatedUser = async (req, res, next) => {
    const token = req.cookies?.[getAuthCookieName()];
    req.user = null;
    res.locals.usuario = null;

    if (!token) {
        return next();
    }

    try {
        const payload = verifyAuthToken(token);
        const sessionUser = await findSessionUser(payload.sub);

        if (!sessionUser) {
            clearInvalidSession(res);
            return next();
        }

        if (sessionUser.auth_provider === 'google') {
            clearInvalidSession(res);
            return next();
        }

        req.user = {
            id: sessionUser.id,
            user_id: sessionUser.id,
            username: sessionUser.username,
            assinante_id: sessionUser.assinante_id,
            status_assinatura: sessionUser.status_assinatura
        };
        res.locals.usuario = req.user;
        return next();
    } catch (error) {
        clearInvalidSession(res);
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
