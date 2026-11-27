const PRIORITY_KEYS = ['message', 'detail', 'non_field_errors', 'comparisons'];

function collect(value: unknown, into: string[]): void {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) value.forEach(item => collect(item, into));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collect(item, into));
}

/**
 * Texto de um erro da API para mostrar à pessoa. O Service responde em formatos
 * diferentes: `{message}`, `{detail}` (texto ou lista), `{non_field_errors: [...]}`,
 * `{comparisons: [...]}` ou erros por campo do DRF.
 */
export function extractApiError(error: any): string {
  const data = error?.response?.data;
  if (data === undefined || data === null) return error?.message ?? String(error);
  if (typeof data === 'string') return data;

  const messages: string[] = [];
  PRIORITY_KEYS.forEach(key => collect(data[key], messages));
  if (messages.length === 0) collect(data, messages);

  return messages.length > 0 ? messages.join(' ') : String(error);
}
