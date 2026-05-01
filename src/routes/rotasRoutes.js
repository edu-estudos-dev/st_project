import express from 'express';
import RotasController from '../controllers/rotasController.js';

const router = express.Router();

router.get('/', RotasController.index);

router.get('/visitas/:visitaId', RotasController.visitaPonto);

router.post('/operacional/iniciar', RotasController.iniciarRotaOperacional);

router.post('/pontos/:rotaPontoId/chegada', RotasController.registrarChegadaPonto);

export default router;