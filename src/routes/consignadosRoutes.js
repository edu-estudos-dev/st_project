import express from 'express';
import consignadosController from '../controllers/consignadosController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/add', requireWritableSubscription, consignadosController.addSangriaForm);
router.post('/add', requireWritableSubscription, consignadosController.addSangria);
router.get('/', consignadosController.index);
router.get('/edit/:id', requireWritableSubscription, consignadosController.editSangriaForm);
router.post('/edit', requireWritableSubscription, consignadosController.updateSangria);
router.post('/delete/:id', requireWritableSubscription, consignadosController.deleteSangria);
router.post('/:id/pix-confirmado', requireWritableSubscription, consignadosController.updatePixConfirmado);
router.get('/recibo/:id', consignadosController.gerarRecibo);
router.get('/recibo/:id', consignadosController.gerarRecibo);
router.get('/view/:id', consignadosController.viewSangria);
router.get('/controle-geral', consignadosController.renderControleGeralConsignados);
router.get('/receita-consignados', consignadosController.getReceitaConsignados);
router.get('/ultima-sangria/:id', consignadosController.getUltimaSangria);

export default router;
