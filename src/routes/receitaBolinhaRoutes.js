import express from 'express';
import bolinhaController from '../controllers/bolinhaController.js';

const router = express.Router();

// Rota para exibir a receita consolidada de Bolinnhas
router.get('/receita-bolinha', bolinhaController.getReceitaBolinhas);

export default router;
