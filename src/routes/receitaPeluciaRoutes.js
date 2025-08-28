import express from 'express';
import peluciasController from '../controllers/peluciasController.js';

const router = express.Router();

// Rota para exibir a receita consolidada de pelúcias
router.get('/receita-pelucia', peluciasController.getReceitaPelucias);

export default router;
