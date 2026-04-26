import express from 'express';
import LancamentoController from '../controllers/lancamentoController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/', LancamentoController.index);
router.get('/vencimentos', LancamentoController.vencimentos);
router.post('/:id/pagar', requireWritableSubscription, LancamentoController.markAsPaid);
router.get('/add', requireWritableSubscription, LancamentoController.addLancamentoForm);
router.post('/add', requireWritableSubscription, LancamentoController.addLancamento);
router.get('/:id/edit', requireWritableSubscription, LancamentoController.editLancamentoForm);
router.put('/:id', requireWritableSubscription, LancamentoController.editLancamento);
router.delete('/:id', requireWritableSubscription, LancamentoController.deleteLancamento);
router.get('/:id/view', LancamentoController.viewLancamento);
router.post('/search', LancamentoController.search);
export default router;
