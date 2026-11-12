import { Page } from '@playwright/test';
import user from '../../src/mocks/fixtures/user.json';

/** O token não é conferido por ninguém no E2E: a API é simulada. */
const TOKEN = 'e2e-token-msg';

/**
 * Sessão fake antes de cada página (com o provedor escolhido: credentials, github ou gitlab), para o AuthContext considerar o usuário logado sem o OAuth. As chaves e o formato
 * são os do seedFakeSession de src/mocks/initMocks.ts: token, session e provider em JSON; login_timestamp como texto.
 */
export type SessionProvider = 'credentials' | 'github' | 'gitlab';

export async function seedSession(page: Page, provider: SessionProvider = 'credentials'): Promise<void> {
  await page.addInitScript(
    ({ token, session, provider }) => {
      localStorage.setItem('token', JSON.stringify(token));
      localStorage.setItem('provider', JSON.stringify(provider));
      localStorage.setItem('session', JSON.stringify(session));
      localStorage.setItem('login_timestamp', Date.now().toString());
    },
    { token: TOKEN, session: user, provider }
  );
}
