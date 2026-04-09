import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export const securityHeaders = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
});

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        return res.redirect('/login?erro=Muitas tentativas de login. Aguarde 15 minutos e tente novamente.');
    }
});

export const registerRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        return res.redirect('/register?error=Muitas tentativas de cadastro. Aguarde 15 minutos e tente novamente.');
    }
});

export const forgotPasswordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        return res.redirect('/forgot-password?error=Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    }
});

export const resetPasswordRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        return res.redirect('/forgot-password?error=Muitas tentativas de redefinição. Aguarde alguns minutos e tente novamente.');
    }
});

export const disableAuthenticatedCache = (req, res, next) => {
    if (req.user) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    return next();
};
