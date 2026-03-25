import LoginLogout from '../models/loginLogoutModel.js';
import {
    getAuthCookieName,
    getAuthCookieOptions,
    getClearAuthCookieOptions,
    signAuthToken
} from '../utilities/authToken.js';

class LoginLogoutController {
    login(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/login', {
            title: 'Login',
            erro: req.query.erro
        });
    }

    register(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/register', {
            title: 'Cadastro de Usuario',
            error: req.query.error,
            formData: {
                user: '',
                email: ''
            }
        });
    }

    async processLogin(req, res) {
        try {
            const { user, senha } = req.body;
            const usuario = await LoginLogout.login(user, senha);

            if (!usuario) {
                return res.render('pages/login', {
                    title: 'Login',
                    erro: 'Credenciais inválidas'
                });
            }

            const authToken = signAuthToken({
                sub: usuario.id,
                username: usuario.username
            });

            res.cookie(getAuthCookieName(), authToken, getAuthCookieOptions());
            return res.redirect('/painel?success=Login realizado com sucesso');
        } catch (error) {
            console.error('Erro ao processar o login:', error);
            return res.status(500).render('pages/login', {
                title: 'Login',
                erro: 'Erro no servidor. Tente novamente mais tarde.'
            });
        }
    }

    async processRegister(req, res) {
        const formData = {
            user: String(req.body.user ?? '').trim(),
            email: String(req.body.email ?? '').trim()
        };

        try {
            const senha = String(req.body.senha ?? '');

            if (!formData.user || !formData.email || !senha) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuario',
                    error: 'Preencha nome de usuario, e-mail e senha.',
                    formData
                });
            }

            const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
            if (!emailValido) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuario',
                    error: 'Informe um e-mail valido.',
                    formData
                });
            }

            if (senha.length < 3) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuario',
                    error: 'A senha precisa ter pelo menos 3 caracteres.',
                    formData
                });
            }

            const result = await LoginLogout.createUser({
                user: formData.user,
                email: formData.email,
                senha
            });

            if (result?.error) {
                return res.status(409).render('pages/register', {
                    title: 'Cadastro de Usuario',
                    error: result.error,
                    formData
                });
            }

            return res.redirect('/login?success=Cadastro realizado com sucesso. Faça login para continuar.');
        } catch (error) {
            console.error('Erro ao processar o cadastro:', error);
            return res.status(500).render('pages/register', {
                title: 'Cadastro de Usuario',
                error: 'Erro no servidor. Tente novamente mais tarde.',
                formData
            });
        }
    }

    logout(req, res) {
        res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
        res.clearCookie('connect.sid');
        return res.redirect('/login?success=Logout realizado com sucesso');
    }
}

export default new LoginLogoutController();
