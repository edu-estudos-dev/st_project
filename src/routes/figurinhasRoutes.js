import express from 'express';
import figurinhasController from '../controllers/figurinhasController.js';
import { requireWritableSubscription } from '../middleware/subscriptionStatus.js';

const router = express.Router();

router.get('/add', requireWritableSubscription, figurinhasController.addSangriaForm);
router.post('/add', requireWritableSubscription, figurinhasController.addSangria);
router.get('/', figurinhasController.index);
router.get('/edit/:id', requireWritableSubscription, figurinhasController.editSangriaForm);
router.post('/edit', requireWritableSubscription, figurinhasController.updateSangria);
router.post('/delete/:id', requireWritableSubscription, figurinhasController.deleteSangria);
router.get('/view/:id', figurinhasController.viewSangria);
router.get('/controle-geral', figurinhasController.renderControleGeralFigurinhas);
router.get('/receita-figurinha', figurinhasController.getReceitaFigurinhas);
router.get('/ultima-sangria/:id', figurinhasController.getUltimaSangria);

export default router;
