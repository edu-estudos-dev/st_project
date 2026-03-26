import express from 'express';
import figurinhasController from '../controllers/figurinhasController.js';

const router = express.Router();

router.get('/add', figurinhasController.addSangriaForm);
router.post('/add', figurinhasController.addSangria);
router.get('/', figurinhasController.index);
router.get('/edit/:id', figurinhasController.editSangriaForm);
router.post('/edit', figurinhasController.updateSangria);
router.post('/delete/:id', figurinhasController.deleteSangria);
router.get('/view/:id', figurinhasController.viewSangria);
router.get('/controle-geral', figurinhasController.renderControleGeralFigurinhas);
router.get('/receita-figurinha', figurinhasController.getReceitaFigurinhas);
router.get('/ultima-sangria/:id', figurinhasController.getUltimaSangria);

export default router;
