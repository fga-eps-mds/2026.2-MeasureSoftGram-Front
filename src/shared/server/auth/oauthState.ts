import { randomBytes, timingSafeEqual } from 'node:crypto';

export type OAuthProvider = 'github' | 'gitlab';

export interface OAuthStateContext {
  provider: OAuthProvider;
  returnTo: string | null;
}

interface StoredOAuthState extends OAuthStateContext {
  nonce: string;
  expiresAt: number;
}

const NONCE_BYTES = 16;
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export const isOAuthProvider = (value: unknown): value is OAuthProvider => value === 'github' || value === 'gitlab';

export const generateNonce = () => randomBytes(NONCE_BYTES).toString('hex');

/** Valor do cookie do state: o contexto do login e o nonce, que também vai na URL do provedor. */
export const serializeState = (context: OAuthStateContext, nonce = generateNonce(), now = Date.now()) => {
  const stored: StoredOAuthState = { ...context, nonce, expiresAt: now + OAUTH_STATE_TTL_MS };
  return { nonce, cookieValue: Buffer.from(JSON.stringify(stored)).toString('base64url') };
};

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Confere o state devolvido pelo provedor com o cookie. Devolve o contexto do login, ou null se o cookie falta,
 * está corrompido, expirou ou o state não confere. O cookie é de uso único: quem chama sempre o apaga.
 */
export const verifyState = (
  cookieValue: string | undefined,
  received: string | null | undefined,
  now = Date.now()
): OAuthStateContext | null => {
  if (!cookieValue || !received) return null;

  try {
    const stored = JSON.parse(Buffer.from(cookieValue, 'base64url').toString('utf8')) as StoredOAuthState;

    if (typeof stored.nonce !== 'string' || !safeEqual(stored.nonce, received)) return null;
    if (now > stored.expiresAt || !isOAuthProvider(stored.provider)) return null;

    return { provider: stored.provider, returnTo: typeof stored.returnTo === 'string' ? stored.returnTo : null };
  } catch {
    return null;
  }
};
