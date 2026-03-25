import jwt from 'jsonwebtoken';

const TOKEN_COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRES_IN = '8h';
const INSECURE_DEFAULTS = new Set([
    '',
    'your-jwt-secret-key',
    'your-secret-key'
]);

let hasWarnedAboutJwtSecret = false;

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || '';

    if (INSECURE_DEFAULTS.has(secret)) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET invalido para producao.');
        }

        if (!hasWarnedAboutJwtSecret) {
            hasWarnedAboutJwtSecret = true;
            console.warn('JWT_SECRET esta usando um valor padrao ou vazio. Troque por um segredo forte no arquivo .env.');
        }
    }

    return secret;
};

export const signAuthToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: TOKEN_EXPIRES_IN,
        issuer: 'st_project',
        audience: 'st_project_users'
    });
};

export const verifyAuthToken = (token) => {
    return jwt.verify(token, getJwtSecret(), {
        issuer: 'st_project',
        audience: 'st_project_users'
    });
};

export const getAuthCookieName = () => TOKEN_COOKIE_NAME;

export const getAuthCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
    path: '/'
});

export const getClearAuthCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
});
