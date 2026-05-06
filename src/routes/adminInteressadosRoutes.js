import express from 'express';
import AdminAssinantesController from '../controllers/adminAssinantesController.js';
import { requireSaasAdmin } from '../middleware/requireSaasAdmin.js';

const router = express.Router();

router.use(requireSaasAdmin);

router.get('/', AdminAssinantesController.interessados);
router.post('/:id/status', AdminAssinantesController.atualizarStatusInteressado);

export default router;
