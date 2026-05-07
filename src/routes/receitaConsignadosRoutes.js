import express from 'express';
import consignadosController from '../controllers/consignadosController.js';

const router = express.Router();

// Rota para exibir a receita consolidada de consignados.
router.get('/receita-consignados', consignadosController.getReceitaConsignados);

export default router;
