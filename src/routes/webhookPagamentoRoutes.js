import express from 'express';

import {
  receberWebhookAsaas
} from '../controllers/webhookPagamentoController.js';

const router = express.Router();

router.post('/asaas', receberWebhookAsaas);

export default router;