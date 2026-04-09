class PainelController {
   renderPainel(req, res) {
       res.render('pages/painel', {
           title: 'Painel de Controle',
           usuario: req.user,
           financialNotifications: res.locals.financialNotifications || { proximos: [], atrasados: [], total: 0 }
       });
   }
}

export default new PainelController();

