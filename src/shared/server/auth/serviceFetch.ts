import { stripTrailingSlashes } from '../../utils/stripTrailingSlashes';

const DEFAULT_SERVICE_URL = 'http://localhost:8080/api';

export const getServiceUrl = (): string => stripTrailingSlashes(process.env.SERVICE_URL || DEFAULT_SERVICE_URL);

type PlainHeaders = Record<string, string>;
type ServiceInit = Omit<RequestInit, 'headers'> & { headers?: PlainHeaders };

/**
 * Chamada do servidor do Next ao Service. O salto é interno e sem TLS: sem `X-Forwarded-Proto`, o Django em produção
 * (`SECURE_SSL_REDIRECT`) responde 301 para `https://service:8080` e a chamada falha.
 */
export const serviceFetch = (url: string, init: ServiceInit = {}): Promise<Response> =>
  fetch(url, { cache: 'no-store', ...init, headers: { ...init.headers, 'X-Forwarded-Proto': 'https' } });
