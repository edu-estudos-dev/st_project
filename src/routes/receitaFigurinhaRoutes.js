import express from 'express';
import figurinhasController from '../controllers/figurinhasController.js';

const router = express.Router();

// Rota para exibir a receita consolidada de figurinhas
router.get('/receita-figurinha', figurinhasController.getReceitaFigurinhas);

export default router;
