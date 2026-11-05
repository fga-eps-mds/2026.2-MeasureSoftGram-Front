import { createHash } from 'node:crypto';

export interface ServiceUser {
  username: string;
  [key: string]: unknown;
}

export type TokenValidation = { status: 'valid'; user: ServiceUser } | { status: 'invalid' } | { status: 'unavailable' };

const DEFAULT_SERVICE_URL = 'http://localhost:8080/api';
export const VALIDATION_TIMEOUT_MS = 3000;
export const VALIDATION_CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const cache = new Map<string, { user: ServiceUser; expiresAt: number }>();

/** Lida em execução (não fica fixada no build), para o mesmo build servir qualquer ambiente. */
export const getServiceUrl = (): string => (process.env.SERVICE_URL || DEFAULT_SERVICE_URL).replace(/\/+$/, '');

const cacheKey = (token: string) => createHash('sha256').update(token).digest('hex');

export const clearValidationCache = () => cache.clear();

const remember = (key: string, user: ServiceUser, now: number) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.forEach((entry, entryKey) => {
      if (entry.expiresAt <= now) cache.delete(entryKey);
    });
    if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  }
  cache.set(key, { user, expiresAt: now + VALIDATION_CACHE_TTL_MS });
};

/**
 * O token do Service é opaco e não expira lá, então a única validação real é perguntar a ele (`GET /v1/accounts/`).
 * - 401/403: o token foi rejeitado (`invalid`).
 * - Qualquer outra falha (Service fora do ar, timeout, 5xx): `unavailable`. Indisponibilidade não pode deslogar ninguém.
 * Token válido fica 60 s em cache (pela chave SHA-256), senão cada prefetch do menu geraria uma chamada ao Service.
 */
export async function validateToken(token: string): Promise<TokenValidation> {
  const now = Date.now();
  const key = cacheKey(token);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) return { status: 'valid', user: cached.user };
  cache.delete(key);

  try {
    const response = await fetch(`${getServiceUrl()}/v1/accounts/`, {
      headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS)
    });

    if (response.status === 401 || response.status === 403) return { status: 'invalid' };
    if (!response.ok) return { status: 'unavailable' };

    const user = (await response.json()) as ServiceUser;
    remember(key, user, now);

    return { status: 'valid', user };
  } catch {
    return { status: 'unavailable' };
  }
}
