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
router.get('/forgot-password', LoginLogoutController.forgotPassword);
router.post('/forgot-password', forgotPasswordRateLimiter, LoginLogoutController.processForgotPassword);
router.get('/reset-password', LoginLogoutController.resetPassword);
router.post('/reset-password', resetPasswordRateLimiter, LoginLogoutController.processResetPassword);
router.post('/logout', LoginLogoutController.logout);

export default router;
