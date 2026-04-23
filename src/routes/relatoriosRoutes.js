import express from 'express';
import RelatoriosController from '../controllers/relatoriosController.js';

const router = express.Router();

router.get('/', RelatoriosController.index);

export default router;
