import LoginLogout from '../models/loginLogoutModel.js';
import { buildPasswordResetUrl, dispatchPasswordResetLink } from '../utilities/passwordReset.js';
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

    forgotPassword(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/forgotPassword', {
            title: 'Recuperar Senha',
            error: req.query.error || null,
            success: req.query.success || null,
            previewLink: null,
            formData: {
                email: ''
            }
        });
    }

    async processForgotPassword(req, res) {
        const email = String(req.body.email ?? '').trim();

        if (!email) {
            return res.status(400).render('pages/forgotPassword', {
                title: 'Recuperar Senha',
                error: 'Informe o e-mail cadastrado.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailValido) {
            return res.status(400).render('pages/forgotPassword', {
                title: 'Recuperar Senha',
                error: 'Informe um e-mail válido.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }

        try {
            const resetData = await LoginLogout.createPasswordResetToken(email);
            let previewLink = null;

            if (resetData?.token) {
                const resetUrl = buildPasswordResetUrl(req, resetData.token);
                const dispatchResult = await dispatchPasswordResetLink({
                    user: resetData.user,
                    resetUrl
                });
                previewLink = dispatchResult.previewUrl;
            }

            return res.render('pages/forgotPassword', {
                title: 'Recuperar Senha',
                error: null,
                success: 'Se existir uma conta para este e-mail, enviamos as instruções de redefinição.',
                previewLink,
                formData: { email: '' }
            });
        } catch (error) {
            console.error('Erro ao processar recuperação de senha:', error);
            return res.status(500).render('pages/forgotPassword', {
                title: 'Recuperar Senha',
                error: 'Não foi possível iniciar a recuperação de senha. Tente novamente.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }
    }

    async resetPassword(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        const token = String(req.query.token ?? '').trim();
        if (!token) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'Link de redefinição inválido.',
                success: null,
                token: '',
                isTokenValid: false
            });
        }

        try {
            const resetToken = await LoginLogout.getValidPasswordResetToken(token);

            return res.render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: resetToken ? null : 'Este link de redefinição expirou ou já foi utilizado.',
                success: null,
                token,
                isTokenValid: Boolean(resetToken)
            });
        } catch (error) {
            console.error('Erro ao abrir redefinição de senha:', error);
            return res.status(500).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'Não foi possível validar o link de redefinição.',
                success: null,
                token: '',
                isTokenValid: false
            });
        }
    }

    async processResetPassword(req, res) {
        const token = String(req.body.token ?? '').trim();
        const senha = String(req.body.senha ?? '');
        const confirmarSenha = String(req.body.confirmarSenha ?? '');

        if (!token) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'Link de redefinição inválido.',
                success: null,
                token: '',
                isTokenValid: false
            });
        }

        if (!senha || !confirmarSenha) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'Preencha a nova senha e a confirmação.',
                success: null,
                token,
                isTokenValid: true
            });
        }

        if (senha.length < 3) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'A senha precisa ter pelo menos 3 caracteres.',
                success: null,
                token,
                isTokenValid: true
            });
        }

        if (senha !== confirmarSenha) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'A confirmação de senha não confere.',
                success: null,
                token,
                isTokenValid: true
            });
        }

        try {
            const result = await LoginLogout.resetPasswordWithToken(token, senha);

            if (!result.success) {
                return res.status(400).render('pages/resetPassword', {
                    title: 'Redefinir Senha',
                    error: result.error,
                    success: null,
                    token,
                    isTokenValid: false
                });
            }

            return res.redirect('/login?success=Senha redefinida com sucesso. Faça login para continuar.');
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            return res.status(500).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: 'Não foi possível redefinir a senha. Tente novamente.',
                success: null,
                token,
                isTokenValid: true
            });
        }
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
