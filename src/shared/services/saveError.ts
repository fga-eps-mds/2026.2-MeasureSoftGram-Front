import { AxiosError } from 'axios';

/** Para cada campo único: a mensagem que o Service devolve quando o valor já existe e a que a tela mostra. */
export type DuplicateMessages = Record<string, { server: string; message: string }>;

/**
 * Erro de um cadastro ou edição: o 400 de valor já usado vira a mensagem da tela, na ordem dos campos em
 * `duplicates`; qualquer outra falha vira `fallback`.
 */
export class DuplicateFieldError extends Error {
  constructor(
    readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'DuplicateFieldError';
  }
}

export const isDuplicateField = (error: unknown, field: string): boolean =>
  error instanceof DuplicateFieldError && error.field === field;

export function saveError(err: unknown, duplicates: DuplicateMessages, fallback: string): Error {
  const { response } = err as AxiosError;
  if (response?.status === 400) {
    const data = (response.data ?? {}) as Record<string, string[] | undefined>;
    const field = Object.keys(duplicates).find((key) => data[key]?.[0] === duplicates[key].server);
    if (field) return new DuplicateFieldError(field, duplicates[field].message);
  }
  return new Error(fallback);
}
