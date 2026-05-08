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

const requirePublicRegistrationAccess = (req, res, next) => {
    if (isPublicAuthEnabled() || isLocalhostRequest(req)) {
        return next();
    }

    if (req.method === 'GET') {
        return res.status(404).render('pages/404');
    }

    return res.status(403).send('Cadastro temporariamente indisponivel.');
};

router.get('/login', LoginLogoutController.login);
router.post('/login', loginRateLimiter, LoginLogoutController.processLogin);

router.get('/register', requirePublicRegistrationAccess, LoginLogoutController.register);
router.post('/register', requirePublicRegistrationAccess, registerRateLimiter, LoginLogoutController.processRegister);

router.get('/verifique-email', LoginLogoutController.emailVerificationNotice);
router.get('/reenviar-verificacao', LoginLogoutController.resendVerification);
router.post('/reenviar-verificacao', forgotPasswordRateLimiter, LoginLogoutController.processResendVerification);

router.get('/verificar-email', LoginLogoutController.verifyEmail);

router.get('/recuperar-senha', LoginLogoutController.forgotPassword);
router.get('/forgot-password', LoginLogoutController.forgotPassword);
router.post('/recuperar-senha', forgotPasswordRateLimiter, LoginLogoutController.processForgotPassword);
router.post('/forgot-password', forgotPasswordRateLimiter, LoginLogoutController.processForgotPassword);

router.get('/redefinir-senha', LoginLogoutController.resetPassword);
router.get('/reset-password', LoginLogoutController.resetPassword);
router.post('/redefinir-senha', resetPasswordRateLimiter, LoginLogoutController.processResetPassword);
router.post('/reset-password', resetPasswordRateLimiter, LoginLogoutController.processResetPassword);

router.post('/logout', LoginLogoutController.logout);

export default router;