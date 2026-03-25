import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCsrfCookieOptions = () => ({
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
    path: '/'
});

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const safeCompare = (left, right) => {
    if (!left || !right) {
        return false;
    }

    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getRequestCsrfToken = (req) => {
    return req.get('x-csrf-token')
        || req.body?._csrf
        || req.query?._csrf;
};

const rejectCsrfRequest = (req, res) => {
    const message = 'Sua sessao expirou ou a requisicao nao foi validada. Recarregue a pagina e tente novamente.';
    const acceptsJson = req.xhr || req.get('accept')?.includes('application/json');

    if (acceptsJson) {
        return res.status(403).json({ message });
    }

    const fallbackPath = req.get('referer') || '/login';
    const separator = fallbackPath.includes('?') ? '&' : '?';
    return res.redirect(`${fallbackPath}${separator}error=${encodeURIComponent(message)}`);
};

export const attachCsrfToken = (req, res, next) => {
    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!csrfToken) {
        csrfToken = generateCsrfToken();
        res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());
    }

    req.csrfToken = csrfToken;
    res.locals.csrfToken = csrfToken;
    return next();
};

export const requireCsrfProtection = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const requestToken = getRequestCsrfToken(req);

    if (safeCompare(cookieToken, requestToken)) {
        return next();
    }

    return rejectCsrfRequest(req, res);
};
