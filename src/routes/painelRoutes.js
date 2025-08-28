import express from 'express';
import PainelController from '../controllers/painelController.js';

const router = express.Router();

router.get('/', PainelController.renderPainel);

export default router;
