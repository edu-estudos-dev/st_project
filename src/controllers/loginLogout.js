import LoginLogout from '../models/loginLogoutModel.js';
import crypto from 'crypto';
import {
    buildEmailVerificationUrl,
    dispatchEmailVerificationLink
} from '../utilities/emailVerification.js';
import { buildPasswordResetUrl, dispatchPasswordResetLink } from '../utilities/passwordReset.js';
import {
    getAuthCookieName,
    getAuthCookieOptions,
    getClearAuthCookieOptions,
    signAuthToken
} from '../utilities/authToken.js';
import { normalizeSelectedProdutos } from '../utilities/produtoUtils.js';

const PRODUCT_OPTIONS = [
    { value: 'BOLINHAS', label: 'Bolinhas' },
    { value: 'CONSIGNADOS', label: 'Consignados' },
    { value: 'PELUCIAS', label: 'Pelúcias' }
];

const TRIAL_PRODUCTS = PRODUCT_OPTIONS.map((produto) => produto.value);
const MIN_PASSWORD_LENGTH = 8;
const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const PLAN_OPTIONS = {
    '1-ferramenta': {
        codigo: '1-ferramenta',
        nome: 'Plano Essencial',
        descricao: '1 ferramenta',
        preco: 'R$ 24,90/mês',
        valorMensal: 24.90,
        limiteFerramentas: 1
    },
    '2-ferramentas': {
        codigo: '2-ferramentas',
        nome: 'Plano Operador',
        descricao: '2 ferramentas',
        preco: 'R$ 34,90/mês',
        valorMensal: 34.90,
        limiteFerramentas: 2
    },
    '3-ferramentas': {
        codigo: '3-ferramentas',
        nome: 'Plano Completo',
        descricao: '3 ferramentas',
        preco: 'R$ 44,90/mês',
        valorMensal: 44.90,
        limiteFerramentas: 3
    }
};

class LoginLogoutController {
    constructor() {
        this.login = this.login.bind(this);
        this.googleLogin = this.googleLogin.bind(this);
        this.processGoogleCallback = this.processGoogleCallback.bind(this);
        this.processLogin = this.processLogin.bind(this);
    }

    getGoogleClientConfig(req) {
        const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
        const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
        const redirectUri = String(process.env.GOOGLE_REDIRECT_URI || '').trim()
            || `${req.protocol}://${req.get('host')}/auth/google/callback`;

        return {
            clientId,
            clientSecret,
            redirectUri,
            isConfigured: Boolean(clientId && clientSecret)
        };
    }

    getGoogleStateCookieOptions() {
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 10,
            path: '/'
        };
    }

    clearGoogleStateCookie(res) {
        res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
    }

    signInUser(res, usuario) {
        const authToken = signAuthToken({
            sub: usuario.user_id,
            username: usuario.username,
            assinante_id: usuario.assinante_id,
            status_assinatura: usuario.status_assinatura
        });

        const redirectAfterLogin = ['bloqueado', 'cancelado'].includes(usuario.status_assinatura)
            ? '/assinatura/status?success=Login realizado com sucesso'
            : '/painel?success=Login realizado com sucesso';

        res.cookie(getAuthCookieName(), authToken, getAuthCookieOptions());
        return res.redirect(redirectAfterLogin);
    }

    login(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        const googleConfig = this.getGoogleClientConfig(req);

        return res.render('pages/login', {
            title: 'Login',
            erro: req.query.erro,
            success: req.query.success,
            resendVerificationEmail: null,
            googleAuthConfigured: googleConfig.isConfigured,
            robotsMeta: 'noindex, follow',
        });
    }

    googleLogin(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        const googleConfig = this.getGoogleClientConfig(req);

        if (!googleConfig.isConfigured) {
            return res.redirect('/login?erro=Login com Google ainda nao foi configurado.');
        }

        const state = crypto.randomBytes(32).toString('hex');
        const params = new URLSearchParams({
            client_id: googleConfig.clientId,
            redirect_uri: googleConfig.redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            prompt: 'select_account'
        });

        res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, this.getGoogleStateCookieOptions());
        return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
    }

    async processGoogleCallback(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        const googleConfig = this.getGoogleClientConfig(req);
        const code = String(req.query.code || '').trim();
        const state = String(req.query.state || '').trim();
        const storedState = String(req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE] || '').trim();

        this.clearGoogleStateCookie(res);

        if (!googleConfig.isConfigured) {
            return res.redirect('/login?erro=Login com Google ainda nao foi configurado.');
        }

        if (!code || !state || !storedState || state !== storedState) {
            return res.redirect('/login?erro=Nao foi possivel validar o login com Google. Tente novamente.');
        }

        try {
            const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    code,
                    client_id: googleConfig.clientId,
                    client_secret: googleConfig.clientSecret,
                    redirect_uri: googleConfig.redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Falha ao trocar codigo OAuth: ${tokenResponse.status}`);
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData?.access_token;

            if (!accessToken) {
                throw new Error('Google nao retornou access_token.');
            }

            const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });

            if (!profileResponse.ok) {
                throw new Error(`Falha ao buscar perfil Google: ${profileResponse.status}`);
            }

            const profile = await profileResponse.json();

            if (!profile?.email || profile.email_verified !== true) {
                return res.redirect('/login?erro=Use uma conta Google com e-mail verificado.');
            }

            const usuario = await LoginLogout.loginWithGoogle({
                googleId: profile.sub,
                email: profile.email,
                name: profile.name
            });

            return this.signInUser(res, usuario);
        } catch (error) {
            console.error('Erro no login com Google:', error);
            return res.redirect('/login?erro=Nao foi possivel entrar com Google. Tente novamente.');
        }
    }

    register(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        const planoSelecionado = PLAN_OPTIONS[req.query.plano] || null;

        if (!planoSelecionado) {
            return res.redirect('/precos');
        }

        const limiteFerramentas = planoSelecionado.limiteFerramentas;
        const produtosSelecionadosNoTrial = TRIAL_PRODUCTS.slice(0, limiteFerramentas);

        return res.render('pages/register', {
            title: 'Cadastro de Usuário',
            error: req.query.error,
            formData: {
                user: '',
                email: '',
                plano: planoSelecionado?.codigo || '',
                produtos_habilitados: produtosSelecionadosNoTrial
            },
            productOptions: PRODUCT_OPTIONS,
            planoSelecionado
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

    emailVerificationNotice(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/emailVerificationNotice', {
            title: 'Verifique seu e-mail',
            email: req.query.email || '',
            previewLink: null,
            success: req.query.success || null,
            error: req.query.error || null
        });
    }

    resendVerification(req, res) {
        if (req.user) {
            return res.redirect('/painel');
        }

        return res.render('pages/resendVerification', {
            title: 'Reenviar verificacao',
            error: req.query.error || null,
            success: req.query.success || null,
            previewLink: null,
            formData: {
                email: req.query.email || ''
            }
        });
    }

    async processResendVerification(req, res) {
        const email = String(req.body.email ?? '').trim().toLowerCase();

        if (!email) {
            return res.status(400).render('pages/resendVerification', {
                title: 'Reenviar verificacao',
                error: 'Informe o e-mail cadastrado.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!emailValido) {
            return res.status(400).render('pages/resendVerification', {
                title: 'Reenviar verificacao',
                error: 'Informe um e-mail valido.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }

        try {
            const verificationData = await LoginLogout.createEmailVerificationTokenByEmail(email);
            let previewLink = null;

            if (verificationData?.token) {
                const verificationUrl = buildEmailVerificationUrl(req, verificationData.token);
                const dispatchResult = await dispatchEmailVerificationLink({
                    user: verificationData.user,
                    verificationUrl
                });
                previewLink = dispatchResult.previewUrl;
            }

            return res.render('pages/resendVerification', {
                title: 'Reenviar verificacao',
                error: null,
                success: 'Se existir uma conta pendente para este e-mail, enviamos um novo link de verificacao.',
                previewLink,
                formData: { email: '' }
            });
        } catch (error) {
            console.error('Erro ao reenviar verificacao de e-mail:', error);
            return res.status(500).render('pages/resendVerification', {
                title: 'Reenviar verificacao',
                error: 'Nao foi possivel reenviar a verificacao. Tente novamente.',
                success: null,
                previewLink: null,
                formData: { email }
            });
        }
    }

    async verifyEmail(req, res) {
        const token = String(req.query.token ?? '').trim();

        if (!token) {
            return res.redirect('/login?erro=Link de verificacao invalido.');
        }

        try {
            const result = await LoginLogout.verifyEmailWithToken(token);

            if (!result.success) {
                return res.redirect(`/reenviar-verificacao?error=${encodeURIComponent(result.error || 'Link de verificacao invalido ou expirado.')}`);
            }

            return res.redirect('/login?success=E-mail confirmado com sucesso. Faca login para continuar.');
        } catch (error) {
            console.error('Erro ao verificar e-mail:', error);
            return res.redirect('/login?erro=Nao foi possivel confirmar o e-mail. Tente novamente.');
        }
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

        if (senha.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).render('pages/resetPassword', {
                title: 'Redefinir Senha',
                error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
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
                    success: null,
                    resendVerificationEmail: null,
                    googleAuthConfigured: this.getGoogleClientConfig(req).isConfigured,
                    robotsMeta: 'noindex, follow',
                });
            }

            if (usuario.error === 'email_not_verified') {
                return res.status(403).render('pages/login', {
                    title: 'Login',
                    erro: 'Confirme seu e-mail antes de acessar o sistema. Se necessario, reenvie o link de verificacao.',
                    success: null,
                    resendVerificationEmail: usuario.email,
                    googleAuthConfigured: this.getGoogleClientConfig(req).isConfigured,
                    robotsMeta: 'noindex, follow',
                });
            }

            return this.signInUser(res, usuario);
        } catch (error) {
            console.error('Erro ao processar o login:', error);

            return res.status(500).render('pages/login', {
                title: 'Login',
                erro: 'Erro no servidor. Tente novamente mais tarde.',
                success: null,
                resendVerificationEmail: null,
                googleAuthConfigured: this.getGoogleClientConfig(req).isConfigured
            });
        }
    }

    async processRegister(req, res) {
        const planoSelecionado = PLAN_OPTIONS[req.body.plano] || null;

        const formData = {
            user: String(req.body.user ?? '').trim(),
            email: String(req.body.email ?? '').trim(),
            plano: planoSelecionado?.codigo || '',
            produtos_habilitados: Array.isArray(req.body.produtos_habilitados)
                ? req.body.produtos_habilitados
                : [req.body.produtos_habilitados].filter(Boolean)
        };

        try {
            const senha = String(req.body.senha ?? '');
            const confirmarSenha = String(req.body.confirmarSenha ?? '');
            const produtosHabilitados = normalizeSelectedProdutos(formData.produtos_habilitados);

            if (!planoSelecionado) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de UsuÃ¡rio',
                    error: 'Escolha um plano comercial antes de criar sua conta.',
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            if (!formData.user || !formData.email || !senha || !confirmarSenha) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: 'Preencha nome de usuário, e-mail, senha e confirmação de senha.',
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            if (!produtosHabilitados.length) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: 'Selecione pelo menos uma frente da sua operação.',
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            if (produtosHabilitados.length > planoSelecionado.limiteFerramentas) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: `Este plano permite escolher até ${planoSelecionado.limiteFerramentas} ferramenta${planoSelecionado.limiteFerramentas > 1 ? 's' : ''}.`,
                    formData: {
                        ...formData,
                        produtos_habilitados: produtosHabilitados.slice(0, planoSelecionado.limiteFerramentas)
                    },
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

            if (!emailValido) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: 'Informe um e-mail válido.',
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            if (senha.length < MIN_PASSWORD_LENGTH) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            if (senha !== confirmarSenha) {
                return res.status(400).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: 'A confirmação de senha não confere.',
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            const result = await LoginLogout.createUser({
                user: formData.user,
                email: formData.email,
                senha,
                produtos_habilitados: produtosHabilitados,
                plano_codigo: planoSelecionado.codigo,
                plano_nome: planoSelecionado.nome,
                valor_mensal: planoSelecionado.valorMensal
            });

            if (result?.error) {
                return res.status(409).render('pages/register', {
                    title: 'Cadastro de Usuário',
                    error: result.error,
                    formData,
                    productOptions: PRODUCT_OPTIONS,
                    planoSelecionado
                });
            }

            const verificationToken = await LoginLogout.createEmailVerificationToken(result.user_id);
            const verificationUrl = buildEmailVerificationUrl(req, verificationToken);
            const dispatchResult = await dispatchEmailVerificationLink({
                user: result,
                verificationUrl
            });

            return res.render('pages/emailVerificationNotice', {
                title: 'Verifique seu e-mail',
                email: result.email,
                previewLink: dispatchResult.previewUrl,
                success: 'Cadastro criado. Enviamos um link para confirmar seu e-mail antes do primeiro acesso.',
                error: null
            });
        } catch (error) {
            console.error('Erro ao processar o cadastro:', error);

            return res.status(500).render('pages/register', {
                title: 'Cadastro de Usuário',
                error: 'Erro no servidor. Tente novamente mais tarde.',
                formData,
                productOptions: PRODUCT_OPTIONS,
                planoSelecionado
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
