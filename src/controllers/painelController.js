class PainelController {
   renderPainel(req, res) {
       res.render('pages/painel', {
           title: 'Painel de Controle',
           usuario: req.user
       });
   }
}

export default new PainelController();

