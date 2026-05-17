import crypto from 'crypto';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const DEFAULT_WINDOW_MS = 4000;
const activeSubmissions = new Map();

const stableStringify = value => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
};

const sanitizeBody = body => {
  if (!body || typeof body !== 'object') {
    return body || {};
  }

  const copy = { ...body };
  delete copy._csrf;
  delete copy._method;
  return copy;
};

const buildSubmissionKey = req => {
  const userId = req.user?.user_id || req.user?.id || 'anonymous';
  const assinanteId = req.user?.assinante_id || 'no-assinante';
  const actor = `${assinanteId}:${userId}:${req.ip || ''}`;
  const payload = stableStringify(sanitizeBody(req.body));

  return crypto
    .createHash('sha256')
    .update(`${actor}:${req.method}:${req.originalUrl}:${payload}`)
    .digest('hex');
};

const rejectDuplicate = (req, res) => {
  const message = 'Esta acao ja esta em processamento. Aguarde alguns segundos antes de tentar novamente.';
  const acceptsJson =
    req.xhr ||
    req.get('x-requested-with') === 'XMLHttpRequest' ||
    req.get('accept')?.includes('application/json');

  if (acceptsJson) {
    return res.status(409).json({ success: false, message });
  }

  return res.status(409).send(message);
};

export const preventDuplicateSubmission = ({
  windowMs = DEFAULT_WINDOW_MS
} = {}) => (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  if (req.path.startsWith('/webhooks/')) {
    return next();
  }

  const key = buildSubmissionKey(req);

  if (activeSubmissions.has(key)) {
    return rejectDuplicate(req, res);
  }

  const timeout = setTimeout(() => {
    activeSubmissions.delete(key);
  }, windowMs);

  activeSubmissions.set(key, timeout);

  res.once('finish', () => {
    const currentTimeout = activeSubmissions.get(key);

    if (currentTimeout) {
      clearTimeout(currentTimeout);
      setTimeout(() => activeSubmissions.delete(key), windowMs);
    }
  });

  return next();
};
