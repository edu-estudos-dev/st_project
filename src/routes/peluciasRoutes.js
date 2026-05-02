import express from 'express';
import peluciasController from '../controllers/peluciasController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/sangrias/add', requireWritableSubscription, peluciasController.addSangriaForm);
router.post('/sangrias/add', requireWritableSubscription, peluciasController.addSangria);
router.get('/sangrias', peluciasController.index);
router.get('/sangrias/edit/:id', requireWritableSubscription, peluciasController.editSangriaForm);
router.post('/sangrias/edit', requireWritableSubscription, peluciasController.updateSangria);
router.post('/sangrias/delete/:id', requireWritableSubscription, peluciasController.deleteSangria);
router.get('/sangrias/recibo/:id', peluciasController.gerarRecibo);
router.get('/sangrias/view/:id', peluciasController.viewSangria);
router.get('/sangrias/controle-geral', peluciasController.renderControleGeralPelucias);
router.get('/sangrias/receita-pelucia', peluciasController.getReceitaPelucias);
router.get('/sangrias/get-ultimos-dados/:estabelecimentoId', peluciasController.getUltimosDados);

export default router;
