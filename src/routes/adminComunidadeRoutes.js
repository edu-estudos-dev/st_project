import express from 'express';
import AdminComunidadeController from '../controllers/adminComunidadeController.js';
import { requireSaasAdmin } from '../middleware/requireSaasAdmin.js';

const router = express.Router();

router.use(requireSaasAdmin);

router.get('/', AdminComunidadeController.index);

router.post('/topico/:id/ocultar', AdminComunidadeController.ocultarTopico);
router.post('/topico/:id/reexibir', AdminComunidadeController.reexibirTopico);
router.post('/topico/:id/excluir', AdminComunidadeController.excluirTopico);
router.post('/topico/:id/fixar', AdminComunidadeController.alternarFixadoTopico);
router.post('/topico/:id/fechar', AdminComunidadeController.alternarFechadoTopico);

router.post('/resposta/:id/ocultar', AdminComunidadeController.ocultarResposta);
router.post('/resposta/:id/excluir', AdminComunidadeController.excluirResposta);

export default router;