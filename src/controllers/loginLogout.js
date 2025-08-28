import LoginLogout from '../models/loginLogoutModel.js';

class LoginLogoutController {
    login(req, res) {
        res.render('pages/login', {
            title: 'Login',
            erro: req.query.erro
        });
    }

    async processLogin(req, res) {
        try {
            const { user, senha } = req.body;
            console.log(`Tentativa de login: ${user}`);
            const usuario = await LoginLogout.login(user, senha);
            if (usuario) {
                req.session.user = { username: user };
                res.redirect('/painel');
            } else {
                res.render('pages/login', { title: 'Login', erro: 'Credenciais inválidas' });
            }
        } catch (error) {
            console.error('Erro ao processar o login:', error);
            res.status(500).render('pages/login', { title: 'Login', erro: 'Erro no servidor. Tente novamente mais tarde.' });
        }
    }
    

    logout(req, res) {
        req.session.destroy(err => {
            if (err) {
                console.error('Erro ao destruir a sessão:', err);
                return res.status(500).send('Erro ao fazer logout. Tente novamente.');
            }
            res.redirect('/login');
        });
    }
}

export default new LoginLogoutController();
