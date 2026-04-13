import { sendMail } from './mailer.js';

export const buildPasswordResetUrl = (req, token) => {
    const configuredBaseUrl = String(process.env.PASSWORD_RESET_BASE_URL || '').trim().replace(/\/$/, '');
    const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
};

export const shouldExposePasswordResetLink = () => {
    return process.env.SHOW_RESET_LINKS === 'true' || process.env.NODE_ENV !== 'production';
};

const buildPasswordResetEmail = ({ user, resetUrl }) => {
    const appName = String(process.env.APP_NAME || 'VendMaster').trim();
    const username = String(user?.username || 'usuário').trim();
    const subject = `${appName} - redefinição de senha`;
    const text = [
        `Olá, ${username}.`,
        '',
        'Recebemos uma solicitação para redefinir sua senha.',
        'Use o link abaixo para continuar:',
        resetUrl,
        '',
        'Se você não solicitou essa alteração, ignore este e-mail.'
    ].join('\n');
    const html = `
        <div style="font-family: Arial, sans-serif; color: #1f2a44; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
            <h1 style="margin: 0 0 16px; font-size: 28px; color: #1b2340;">${appName}</h1>
            <p>Olá, <strong>${username}</strong>.</p>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 12px; font-weight: 700;">
                    Redefinir senha
                </a>
            </p>
            <p>Se o botão não abrir, copie e cole este link no navegador:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
        </div>
    `;

    return {
        subject,
        text,
        html
    };
};

export const dispatchPasswordResetLink = async ({ user, resetUrl }) => {
    console.log(`[Password Reset] Link gerado para ${user.email}: ${resetUrl}`);

    const emailPayload = buildPasswordResetEmail({ user, resetUrl });
    const delivery = await sendMail({
        to: user.email,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html
    });

    return {
        delivered: delivery.delivered,
        previewUrl: !delivery.delivered && shouldExposePasswordResetLink() ? resetUrl : null
    };
};
