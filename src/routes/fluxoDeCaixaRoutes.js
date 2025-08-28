import express from 'express';
import FluxoDeCaixaController from '../controllers/fluxoDeCaixaController.js';

const router = express.Router();

router.get('/', FluxoDeCaixaController.showFluxoDeCaixa);
router.get('/api/lancamentos', FluxoDeCaixaController.getLancamentos);

export default router;
