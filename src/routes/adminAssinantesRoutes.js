import express from 'express';
import AdminAssinantesController from '../controllers/adminAssinantesController.js';
import { requireSaasAdmin } from '../middleware/requireSaasAdmin.js';

const router = express.Router();

router.use(requireSaasAdmin);

router.get('/', AdminAssinantesController.index);
router.get('/:id/edit', AdminAssinantesController.edit);
router.post('/:id/edit', AdminAssinantesController.update);

export default router;
