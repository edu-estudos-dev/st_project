export const buildPasswordResetUrl = (req, token) => {
    const configuredBaseUrl = String(process.env.PASSWORD_RESET_BASE_URL || '').trim().replace(/\/$/, '');
    const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

export const shouldExposePasswordResetLink = () => {
    return process.env.SHOW_RESET_LINKS === 'true' || process.env.NODE_ENV !== 'production';
};

export const dispatchPasswordResetLink = async ({ user, resetUrl }) => {
    console.log(`[Password Reset] Link gerado para ${user.email}: ${resetUrl}`);

    return {
        delivered: false,
        previewUrl: shouldExposePasswordResetLink() ? resetUrl : null
    };
};
