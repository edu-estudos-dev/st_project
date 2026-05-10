import express from 'express';
import isAuthenticated from '../middleware/isAuthenticated.js';
import { attachSubscriptionStatus } from '../middleware/subscriptionStatus.js';
import ComunidadeController from '../controllers/comunidadeController.js';

const router = express.Router();

router.use('/comunidade', attachSubscriptionStatus);

router.get('/comunidade', ComunidadeController.index);
router.get('/comunidade/categoria/:slug', ComunidadeController.categoria);
router.get('/comunidade/topico/:slug', ComunidadeController.topico);

router.get(
  '/comunidade/novo',
  isAuthenticated,
  attachSubscriptionStatus,
  ComunidadeController.novo
);

router.post(
  '/comunidade/novo',
  isAuthenticated,
  attachSubscriptionStatus,
  ComunidadeController.criar
);

router.post(
  '/comunidade/topico/:slug/responder',
  isAuthenticated,
  attachSubscriptionStatus,
  ComunidadeController.responder
);

export default router;