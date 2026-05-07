import express from 'express';
import RotasController from '../controllers/rotasController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/', RotasController.index);

router.get('/visitas/:visitaId', RotasController.visitaPonto);

router.post('/operacional/iniciar', requireWritableSubscription, RotasController.iniciarRotaOperacional);

router.post('/pontos/:rotaPontoId/chegada', requireWritableSubscription, RotasController.registrarChegadaPonto);

export default router;
