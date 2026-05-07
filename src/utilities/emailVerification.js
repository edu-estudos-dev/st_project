import { sendMail } from './mailer.js';

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildEmailVerificationUrl = (req, token) => {
    const configuredBaseUrl = String(process.env.EMAIL_VERIFICATION_BASE_URL || process.env.PASSWORD_RESET_BASE_URL || '')
        .trim()
        .replace(/\/$/, '');
    const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/verificar-email?token=${encodeURIComponent(token)}`;
};

export const shouldExposeEmailVerificationLink = () => {
    return process.env.SHOW_VERIFICATION_LINKS === 'true' || process.env.NODE_ENV !== 'production';
};

const buildEmailVerificationEmail = ({ user, verificationUrl }) => {
    const appName = String(process.env.APP_NAME || 'VendMaster').trim();
    const username = String(user?.username || 'usuario').trim();
    const safeAppName = escapeHtml(appName);
    const safeUsername = escapeHtml(username);
    const safeVerificationUrl = escapeHtml(verificationUrl);
    const subject = `${appName} - confirme seu e-mail`;
    const text = [
        `Ola, ${username}.`,
        '',
        'Confirme seu e-mail para liberar o acesso ao VendMaster.',
        'Use o link abaixo para continuar:',
        verificationUrl,
        '',
        'Se voce nao criou esta conta, ignore este e-mail.'
    ].join('\n');
    const html = `
        <div style="font-family: Arial, sans-serif; color: #1f2a44; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
            <h1 style="margin: 0 0 16px; font-size: 28px; color: #1b2340;">${safeAppName}</h1>
            <p>Ola, <strong>${safeUsername}</strong>.</p>
            <p>Confirme seu e-mail para liberar o acesso ao VendMaster.</p>
            <p style="margin: 24px 0;">
                <a href="${safeVerificationUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 12px; font-weight: 700;">
                    Confirmar e-mail
                </a>
            </p>
            <p>Se o botao nao abrir, copie e cole este link no navegador:</p>
            <p><a href="${safeVerificationUrl}">${safeVerificationUrl}</a></p>
            <p>Se voce nao criou esta conta, ignore este e-mail.</p>
        </div>
    `;

    return { subject, text, html };
};

export const dispatchEmailVerificationLink = async ({ user, verificationUrl }) => {
    console.log(`[Email Verification] Solicitacao gerada para ${user.email}.`);

    const emailPayload = buildEmailVerificationEmail({ user, verificationUrl });
    let delivery = {
        delivered: false,
        skipped: true,
        reason: 'not_attempted'
    };

    try {
        delivery = await sendMail({
            to: user.email,
            subject: emailPayload.subject,
            text: emailPayload.text,
            html: emailPayload.html
        });
    } catch (error) {
        console.error('[Email Verification] Falha ao enviar e-mail:', error);
    }

    return {
        delivered: Boolean(delivery?.delivered),
        previewUrl: shouldExposeEmailVerificationLink() ? verificationUrl : null
    };
};
