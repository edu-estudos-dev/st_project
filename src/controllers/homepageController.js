class HomepageController {
    renderHomepage(req, res) {
        console.log('Renderizando página inicial');
        res.render('pages/homepage', {
            title: 'Página Inicial'
        });
    }
}

export default new HomepageController();

