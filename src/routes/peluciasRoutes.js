import express from 'express';
import peluciasController from '../controllers/peluciasController.js';

const router = express.Router();

console.log('Registrando rotas de pelúcias...');

router.get('/sangrias/add', (req, res) => {
    console.log('Rota /sangrias/add acessada');
    peluciasController.addSangriaForm(req, res);
});
router.post('/sangrias/add', (req, res) => {
    console.log('Rota /sangrias/add (POST) acessada');
    peluciasController.addSangria(req, res);
});
router.get('/sangrias', (req, res) => {
    console.log('Rota /sangrias acessada');
    peluciasController.index(req, res);
});
router.get('/sangrias/edit/:id', (req, res) => {
    console.log('Rota /sangrias/edit/:id acessada');
    peluciasController.editSangriaForm(req, res);
});
router.post('/sangrias/edit', (req, res) => {
    console.log('Rota /sangrias/edit (POST) acessada');
    peluciasController.updateSangria(req, res);
});
router.post('/sangrias/delete/:id', (req, res) => {
    console.log('Rota /sangrias/delete/:id (POST) acessada');
    peluciasController.deleteSangria(req, res);
});
router.get('/sangrias/view/:id', (req, res) => {
    console.log('Rota /sangrias/view/:id acessada');
    peluciasController.viewSangria(req, res);
});
router.get('/sangrias/controle-geral', (req, res) => {
    console.log('Rota /sangrias/controle-geral acessada');
    peluciasController.renderControleGeralPelucias(req, res);
});
router.get('/sangrias/receita-pelucia', (req, res) => {
    console.log('Rota /sangrias/receita-pelucia acessada');
    peluciasController.getReceitaPelucias(req, res);
});
router.get('/sangrias/get-ultima-leitura/:estabelecimentoId', (req, res) => {
    console.log('Rota /sangrias/get-ultima-leitura/:estabelecimentoId acessada');
    peluciasController.getUltimaLeitura(req, res);
});

console.log('Rotas de pelúcias registradas.');

export default router;
