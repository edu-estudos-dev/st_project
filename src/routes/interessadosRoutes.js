import express from 'express';
import interessadosController from '../controllers/interessadosController.js';
import { contactRateLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/enviar-contato', contactRateLimiter, interessadosController.salvarContato);

export default router;
