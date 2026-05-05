import LoginLogout from '../models/loginLogoutModel.js';
import { normalizeSelectedProdutos } from '../utilities/produtoUtils.js';
import { buildPasswordResetUrl, dispatchPasswordResetLink } from '../utilities/passwordReset.js';
import {
    getAuthCookieName,
    getAuthCookieOptions,
    getClearAuthCookieOptions,
    signAuthToken
} from '../utilities/authToken.js';

const PRODUCT_OPTIONS = [
    { value: 'BOLINHAS', label: 'Bolinhas' },
    { value: 'FIGURINHAS', label: 'Consignados' },
    { value: 'PELUCIAS', label: 'Pelúcias' }
];

class LoginLogoutController {
    login(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/login', {
            title: 'Login',
            erro: req.query.erro,
            robotsMeta: 'noindex, follow',
        });
    }

    register(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/register', {
            title: 'Cadastro de Usu�rio',
            error: req.query.error,
            formData: {
                user: '',
                email: '',
                produtos_habilitados: []
            },
            productOptions: PRODUCT_OPTIONS
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
                    erro: 'Credenciais inválidas',
                    robotsMeta: 'noindex, follow',
                });
            }

            if (usuario.status_assinatura === 'bloqueado') {
                return res.status(403).render('pages/login', {
                    title: 'Login',
                    erro: 'Assinatura bloqueada. Entre em contato com o suporte.'
                });
            }

            const authToken = signAuthToken({
                sub: usuario.user_id,
                username: usuario.username,
                assinante_id: usuario.assinante_id,
                status_assinatura: usuario.status_assinatura
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
            email: String(req.body.email ?? '').trim(),
            produtos_habilitados: Array.isArray(req.body.produtos_habilitados)
                ? req.body.produtos_habilitados
                : [req.body.produtos_habilitados].filter(Boolean)
        };

        try {
            const senha = String(req.body.senha ?? '');
            const confirmarSenha = String(req.body.confirmarSenha ?? '');
            const produtosHabilitados = normalizeSelectedProdutos(formData.produtos_habilitados);

            if (!formData.user || !formData.email || !senha || !confirmarSenha) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usu�rio',
                    error: 'Preencha nome de usuário, e-mail, senha e confirmação de senha.',
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            if (!produtosHabilitados.length) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de UsuÃ¡rio',
                    error: 'Selecione pelo menos um produto da sua operaÃ§Ã£o.',
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
            if (!emailValido) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usu�rio',
                    error: 'Informe um e-mail válido.',
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            if (senha.length < 3) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usu�rio',
                    error: 'A senha precisa ter pelo menos 3 caracteres.',
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            if (senha !== confirmarSenha) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usu�rio',
                    error: 'A confirmação de senha não confere.',
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            const result = await LoginLogout.createUser({
                user: formData.user,
                email: formData.email,
                senha,
                produtos_habilitados: produtosHabilitados
            });

            if (result?.error) {
                return res.status(409).render('pages/register', {
                    title: 'Cadastro de Usu�rio',
                    error: result.error,
                    formData,
                    productOptions: PRODUCT_OPTIONS
                });
            }

            const authToken = signAuthToken({
                sub: result.user_id,
                username: result.username,
                assinante_id: result.assinante_id,
                status_assinatura: result.status_assinatura
            });

            res.cookie(getAuthCookieName(), authToken, getAuthCookieOptions());
            return res.redirect('/painel?success=Cadastro realizado com sucesso');
        } catch (error) {
            console.error('Erro ao processar o cadastro:', error);
            return res.status(500).render('pages/register', {
                title: 'Cadastro de Usu�rio',
                error: 'Erro no servidor. Tente novamente mais tarde.',
                formData,
                productOptions: PRODUCT_OPTIONS
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

