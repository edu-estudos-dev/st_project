import express from 'express';

import {
  renderizarFormularioDadosCobranca,
  obterDadosCobranca,
  salvarDadosCobranca,
  iniciarPagamento,
  trocarFormaPagamento
} from '../controllers/pagamentoController.js';

const router = express.Router();

router.get('/dados-cobranca/formulario', renderizarFormularioDadosCobranca);
router.get('/dados-cobranca', obterDadosCobranca);
router.post('/dados-cobranca', salvarDadosCobranca);
router.post('/iniciar', iniciarPagamento);
router.post('/trocar-forma', trocarFormaPagamento);

export default router;