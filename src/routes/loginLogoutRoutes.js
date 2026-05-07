import express from 'express';
import LoginLogoutController from '../controllers/loginLogout.js';
import {
    forgotPasswordRateLimiter,
    loginRateLimiter,
    registerRateLimiter,
    resetPasswordRateLimiter
} from '../middleware/securityMiddleware.js';

const router = express.Router();

const isPublicAuthEnabled = () => {
    return ['1', 'true', 'yes', 'on'].includes(
        String(process.env.PUBLIC_AUTH_ENABLED || '').trim().toLowerCase()
    );
};

const isLocalhostRequest = (req) => {
    const hostname = String(req.hostname || '').toLowerCase();
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === '[::1]'
        || hostname.endsWith('.localhost');
};

const requireLocalAuthAccess = (req, res, next) => {
    if (isPublicAuthEnabled() || isLocalhostRequest(req)) {
        return next();
    }

    if (req.method === 'GET') {
        return res.status(404).render('pages/404');
    }

    return res.status(403).send('Autenticacao temporariamente indisponivel.');
};

router.get('/login', requireLocalAuthAccess, LoginLogoutController.login);
router.post('/login', requireLocalAuthAccess, loginRateLimiter, LoginLogoutController.processLogin);
router.get('/register', requireLocalAuthAccess, LoginLogoutController.register);
router.post('/register', requireLocalAuthAccess, registerRateLimiter, LoginLogoutController.processRegister);
router.get('/verifique-email', requireLocalAuthAccess, LoginLogoutController.emailVerificationNotice);
router.get('/reenviar-verificacao', requireLocalAuthAccess, LoginLogoutController.resendVerification);
router.post('/reenviar-verificacao', requireLocalAuthAccess, forgotPasswordRateLimiter, LoginLogoutController.processResendVerification);
router.get('/verificar-email', requireLocalAuthAccess, LoginLogoutController.verifyEmail);
router.get('/recuperar-senha', requireLocalAuthAccess, LoginLogoutController.forgotPassword);
router.get('/forgot-password', requireLocalAuthAccess, LoginLogoutController.forgotPassword);
router.post('/recuperar-senha', requireLocalAuthAccess, forgotPasswordRateLimiter, LoginLogoutController.processForgotPassword);
router.post('/forgot-password', requireLocalAuthAccess, forgotPasswordRateLimiter, LoginLogoutController.processForgotPassword);
router.get('/redefinir-senha', requireLocalAuthAccess, LoginLogoutController.resetPassword);
router.get('/reset-password', requireLocalAuthAccess, LoginLogoutController.resetPassword);
router.post('/redefinir-senha', requireLocalAuthAccess, resetPasswordRateLimiter, LoginLogoutController.processResetPassword);
router.post('/reset-password', requireLocalAuthAccess, resetPasswordRateLimiter, LoginLogoutController.processResetPassword);
router.post('/logout', LoginLogoutController.logout);

export default router;
