const MAX_SEARCH_TERM_LENGTH = 80;

export class SearchValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SearchValidationError';
    this.statusCode = 400;
  }
}

export function normalizeSearchTerm(value, fieldLabel = 'termo de pesquisa') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    throw new SearchValidationError(`Informe um ${fieldLabel}.`);
  }

  if (/[<>]/.test(normalized)) {
    throw new SearchValidationError(`${fieldLabel} contem caracteres invalidos.`);
  }

  if (normalized.length > MAX_SEARCH_TERM_LENGTH) {
    throw new SearchValidationError(
      `${fieldLabel} deve ter no maximo ${MAX_SEARCH_TERM_LENGTH} caracteres.`
    );
  }

  return normalized;
}
