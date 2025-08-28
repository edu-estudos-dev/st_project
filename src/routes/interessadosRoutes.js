import express from 'express';
import interessadosController from '../controllers/interessadosController.js';

const router = express.Router();

router.post('/enviar-contato', interessadosController.salvarContato);

export default router;
