import express from 'express';
import LoginLogoutController from '../controllers/loginLogout.js';

const router = express.Router();

router.get('/login', LoginLogoutController.login);
router.post('/login', LoginLogoutController.processLogin);
router.get('/logout', LoginLogoutController.logout);

export default router;
