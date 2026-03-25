import express from 'express';
import peluciasController from '../controllers/peluciasController.js';

const router = express.Router();

router.get('/sangrias/add', peluciasController.addSangriaForm);
router.post('/sangrias/add', peluciasController.addSangria);
router.get('/sangrias', peluciasController.index);
router.get('/sangrias/edit/:id', peluciasController.editSangriaForm);
router.post('/sangrias/edit', peluciasController.updateSangria);
router.post('/sangrias/delete/:id', peluciasController.deleteSangria);
router.get('/sangrias/view/:id', peluciasController.viewSangria);
router.get('/sangrias/controle-geral', peluciasController.renderControleGeralPelucias);
router.get('/sangrias/receita-pelucia', peluciasController.getReceitaPelucias);
router.get('/sangrias/get-ultimos-dados/:estabelecimentoId', peluciasController.getUltimosDados);

export default router;
