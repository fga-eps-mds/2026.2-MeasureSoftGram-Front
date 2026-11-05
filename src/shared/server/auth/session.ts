import { cache } from 'react';
import { cookies } from 'next/headers';
import fixtureUser from '../../../mocks/fixtures/user.json';
import { isMockingEnabled } from './mocking';
import { LOGIN_AT_COOKIE, PROVIDER_COOKIE, TOKEN_COOKIE } from './cookies';
import { validateToken } from './validateToken';

export type SessionProvider = 'github' | 'gitlab' | 'credentials';

export interface ServerSession {
  /** null quando o Service não respondeu: o cliente busca o usuário depois. */
  user: Record<string, any> | null;
  provider: SessionProvider;
  loginAt: number | null;
}

const toProvider = (value: string | undefined): SessionProvider =>
  value === 'github' || value === 'gitlab' ? value : 'credentials';

export const getSession = cache(async (): Promise<ServerSession | null> => {
  if (isMockingEnabled()) {
    return { user: fixtureUser, provider: 'credentials', loginAt: null };
  }

  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  const validation = await validateToken(token);
  if (validation.status === 'invalid') return null;

  const loginAt = Number(store.get(LOGIN_AT_COOKIE)?.value);

  return {
    user: validation.status === 'valid' ? validation.user : null,
    provider: toProvider(store.get(PROVIDER_COOKIE)?.value),
    loginAt: Number.isFinite(loginAt) && loginAt > 0 ? loginAt : null
  };
});
