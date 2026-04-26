import express from 'express';
import AssinaturaController from '../controllers/assinaturaController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/produtos', AssinaturaController.editProdutos);
router.post('/produtos', requireWritableSubscription, AssinaturaController.updateProdutos);

export default router;
