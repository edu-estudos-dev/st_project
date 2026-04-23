import express from 'express';
import RotasController from '../controllers/rotasController.js';

const router = express.Router();

router.get('/', RotasController.index);

export default router;
