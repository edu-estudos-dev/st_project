import express from 'express';
import LancamentoController from '../controllers/lancamentoController.js';

const router = express.Router();

router.get('/', LancamentoController.index);
router.get('/add', LancamentoController.addLancamentoForm);
router.post('/add', LancamentoController.addLancamento);
router.get('/:id/edit', LancamentoController.editLancamentoForm);
router.put('/:id', LancamentoController.editLancamento);
router.delete('/:id', LancamentoController.deleteLancamento);
router.get('/:id/view', LancamentoController.viewLancamento);
router.post('/search', LancamentoController.search);
router.post('/:id/updateVencimento', LancamentoController.updateVencimento);

export default router;
