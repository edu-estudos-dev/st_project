import express from 'express';
import LoginLogoutController from '../controllers/loginLogout.js';
import {
    forgotPasswordRateLimiter,
    loginRateLimiter,
    registerRateLimiter,
    resetPasswordRateLimiter
} from '../middleware/securityMiddleware.js';

const router = express.Router();

router.get('/login', LoginLogoutController.login);
router.post('/login', loginRateLimiter, LoginLogoutController.processLogin);
router.get('/register', LoginLogoutController.register);
router.post('/register', registerRateLimiter, LoginLogoutController.processRegister);
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
