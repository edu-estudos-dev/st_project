import express from 'express';

import {
  iniciarPagamento
} from '../controllers/pagamentoController.js';

const router = express.Router();

router.post('/iniciar', iniciarPagamento);

export default router;
