import nodemailer from 'nodemailer';

let cachedTransporter = null;

const readEnv = key => String(process.env[key] ?? '').trim();
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const parsePort = value => {
    const port = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(port) ? port : null;
};

const parseBoolean = value => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

export const getMailConfig = () => {
    const provider = readEnv('MAIL_PROVIDER').toLowerCase();
    const brevoApiKey = readEnv('BREVO_API_KEY');
    const host = readEnv('SMTP_HOST');
    const port = parsePort(readEnv('SMTP_PORT'));
    const user = readEnv('SMTP_USER');
    const pass = readEnv('SMTP_PASS');
    const from = readEnv('MAIL_FROM');
    const secure = parseBoolean(readEnv('SMTP_SECURE'));

    return {
        provider,
        brevoApiKey,
        host,
        port,
        user,
        pass,
        from,
        secure,
        useBrevoApi: Boolean(brevoApiKey) && (provider === 'brevo' || !host || !port || !user || !pass),
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

const parseSender = from => {
    const match = String(from).match(/^(.*?)<([^>]+)>$/);

    if (!match) {
        return {
            name: '',
            email: String(from).trim()
        };
    }

    return {
        name: match[1].replace(/^"|"$/g, '').trim(),
        email: match[2].trim()
    };
};

const sendWithBrevoApi = async ({ config, to, subject, text, html }) => {
    const sender = parseSender(config.from);
    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': config.brevoApiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender,
            to: recipients.map(email => ({ email: String(email).trim() })),
            subject,
            textContent: text,
            htmlContent: html
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
    }
};

export const sendMail = async ({ to, subject, text, html }) => {
    const config = getMailConfig();

    if (config.useBrevoApi) {
        if (!config.from) {
            return {
                delivered: false,
                skipped: true,
                reason: 'mail_from_not_configured'
            };
        }

        await sendWithBrevoApi({ config, to, subject, text, html });

        return {
            delivered: true,
            skipped: false
        };
    }

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
