import express from 'express';
import bolinhaController from '../controllers/bolinhaController.js';

const router = express.Router();

// Rota para exibir o formulário de adição de sangria
router.get('/add', bolinhaController.addSangriaForm);

// Rota para adicionar uma nova sangria
router.post('/add', bolinhaController.addSangria);

// Rota para listar todas as sangrias
router.get('/', bolinhaController.index);

// Rota para exibir o formulário de edição de uma sangria pelo ID
router.get('/edit/:id', bolinhaController.editSangriaForm);

// Rota para atualizar uma sangria existente
router.post('/edit', bolinhaController.updateSangria);

// Rota para deletar uma sangria pelo ID
router.post('/delete/:id', bolinhaController.deleteSangria);

// Rota para visualizar uma sangria específica pelo ID
router.get('/view/:id', bolinhaController.viewSangria);

// Rota para renderizar o controle geral das sangrias
router.get('/controle-geral', bolinhaController.renderControleGeral);

export default router;
