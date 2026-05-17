const PAYMENT_TYPES = new Set(['especie', 'pix']);

export class SangriaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SangriaValidationError';
    this.statusCode = 400;
  }
}

const normalizeRawValue = value => String(value ?? '').trim();

const normalizeDecimalString = value => normalizeRawValue(value).replace(',', '.');

export const parsePositiveIntegerId = (value, fieldLabel) => {
  const raw = normalizeRawValue(value);

  if (!/^\d+$/.test(raw)) {
    throw new SangriaValidationError(`${fieldLabel} invalido.`);
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new SangriaValidationError(`${fieldLabel} invalido.`);
  }

  return parsed;
};

export const parseSangriaDate = value => {
  const raw = normalizeRawValue(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new SangriaValidationError('Informe uma data de sangria valida.');
  }

  const parsed = new Date(`${raw}T00:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== raw
  ) {
    throw new SangriaValidationError('Informe uma data de sangria valida.');
  }

  return raw;
};

export const parseNonNegativeDecimal = (
  value,
  fieldLabel,
  { max = 100000000, maxMessage = null } = {}
) => {
  const raw = normalizeDecimalString(value);

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new SangriaValidationError(`${fieldLabel} deve ser um numero valido e nao negativo.`);
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new SangriaValidationError(`${fieldLabel} deve ser um numero valido e nao negativo.`);
  }

  if (parsed > max) {
    throw new SangriaValidationError(
      maxMessage || `${fieldLabel} deve ser menor ou igual a ${max}.`
    );
  }

  return parsed;
};

export const parseNonNegativeInteger = (
  value,
  fieldLabel,
  { max = 1000000 } = {}
) => {
  const raw = normalizeRawValue(value);

  if (!/^\d+$/.test(raw)) {
    throw new SangriaValidationError(`${fieldLabel} deve ser um numero inteiro e nao negativo.`);
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > max) {
    throw new SangriaValidationError(`${fieldLabel} deve ser um numero inteiro e nao negativo.`);
  }

  return parsed;
};

export const parseCommissionPercent = value => {
  const parsed = parseNonNegativeDecimal(value, 'Comissao', {
    max: 100,
    maxMessage: 'Comissao deve estar entre 0 e 100%.'
  });

  if (parsed > 100) {
    throw new SangriaValidationError('Comissao deve estar entre 0 e 100%.');
  }

  return parsed;
};

export const parsePaymentType = value => {
  const normalized = normalizeRawValue(value).toLowerCase();

  if (!PAYMENT_TYPES.has(normalized)) {
    throw new SangriaValidationError('Tipo de pagamento invalido.');
  }

  return normalized;
};
