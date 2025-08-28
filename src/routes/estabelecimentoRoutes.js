import express from 'express';
import EstabelecimentoController from '../controllers/estabelecimentoController.js';

const router = express.Router();

router.get('/', EstabelecimentoController.index);
router.post('/search', EstabelecimentoController.search);
router.get('/add', EstabelecimentoController.addEstabelecimento);
router.post('/add', EstabelecimentoController.addEstabelecimento);
router.get('/:id/edit', EstabelecimentoController.editEstabelecimentoForm);
router.put('/:id', EstabelecimentoController.editEstabelecimento);
router.delete('/:id', EstabelecimentoController.deleteEstabelecimento);
router.get('/:id/view', EstabelecimentoController.viewEstabelecimento);

export default router;
