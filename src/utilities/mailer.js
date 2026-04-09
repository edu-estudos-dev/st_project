import nodemailer from 'nodemailer';

let cachedTransporter = null;

const readEnv = key => String(process.env[key] ?? '').trim();

const parsePort = value => {
    const port = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(port) ? port : null;
};

const parseBoolean = value => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

export const getMailConfig = () => {
    const host = readEnv('SMTP_HOST');
    const port = parsePort(readEnv('SMTP_PORT'));
    const user = readEnv('SMTP_USER');
    const pass = readEnv('SMTP_PASS');
    const from = readEnv('MAIL_FROM');
    const secure = parseBoolean(readEnv('SMTP_SECURE'));

    return {
        host,
        port,
        user,
        pass,
        from,
        secure,
        isConfigured: Boolean(host && port && user && pass && from)
    };
};

const buildTransporter = () => {
    const config = getMailConfig();

    if (!config.isConfigured) {
        return null;
    }

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
};

export const getMailerTransporter = () => {
    if (!cachedTransporter) {
        cachedTransporter = buildTransporter();
    }

    return cachedTransporter;
};

export const sendMail = async ({ to, subject, text, html }) => {
    const config = getMailConfig();
    const transporter = getMailerTransporter();

    if (!config.isConfigured || !transporter) {
        return {
            delivered: false,
            skipped: true,
            reason: 'smtp_not_configured'
        };
    }

    await transporter.sendMail({
        from: config.from,
        to,
        subject,
        text,
        html
    });

    return {
        delivered: true,
        skipped: false
    };
};
