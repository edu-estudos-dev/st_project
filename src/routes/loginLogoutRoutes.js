import express from 'express';
import LoginLogoutController from '../controllers/loginLogout.js';
import { loginRateLimiter, registerRateLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.get('/login', LoginLogoutController.login);
router.post('/login', loginRateLimiter, LoginLogoutController.processLogin);
router.get('/register', LoginLogoutController.register);
router.post('/register', registerRateLimiter, LoginLogoutController.processRegister);
router.post('/logout', LoginLogoutController.logout);

export default router;
