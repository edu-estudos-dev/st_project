import express from 'express';
import EstabelecimentoController from '../controllers/estabelecimentoController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/', EstabelecimentoController.index);
router.post('/search', EstabelecimentoController.search);
router.get('/add', requireWritableSubscription, EstabelecimentoController.addEstabelecimento);
router.post('/add', requireWritableSubscription, EstabelecimentoController.addEstabelecimento);
router.get('/:id/edit', requireWritableSubscription, EstabelecimentoController.editEstabelecimentoForm);
router.put('/:id', requireWritableSubscription, EstabelecimentoController.editEstabelecimento);
router.delete('/:id', requireWritableSubscription, EstabelecimentoController.deleteEstabelecimento);
router.get('/:id/view', EstabelecimentoController.viewEstabelecimento);

export default router;
