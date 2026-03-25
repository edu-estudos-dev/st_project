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
            username: payload.username
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

    return res.redirect('/login?erro=Por favor, faça login primeiro.');
};

export default isAuthenticated;
