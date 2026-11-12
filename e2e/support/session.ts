import { Page } from '@playwright/test';

/** O token não é conferido por ninguém no E2E: o Service fake (e2e/support/mock-service.mjs) aceita qualquer um. */
export const TOKEN = 'e2e-token-msg';

/** Os cookies da sessão, como em src/shared/server/auth/cookies.ts. */
export const SESSION_COOKIES = {
  token: 'msgram_token',
  provider: 'msgram_provider',
  loginAt: 'msgram_login_at'
} as const;

/**
 * Sessão fake antes de cada página (com o provedor escolhido: credentials, github ou gitlab), nos mesmos cookies que o
 * login grava: o proxy e o layout validam o token no Service fake e entregam o usuário de src/mocks/fixtures/user.json.
 */
export type SessionProvider = 'credentials' | 'github' | 'gitlab';

export async function seedSession(page: Page, baseURL: string, provider: SessionProvider = 'credentials'): Promise<void> {
  await page.context().addCookies(
    [
      [SESSION_COOKIES.token, TOKEN],
      [SESSION_COOKIES.provider, provider],
      [SESSION_COOKIES.loginAt, Date.now().toString()]
    ].map(([name, value]) => ({ name, value, url: baseURL }))
  );
}

/** Valor de um cookie da página, ou null sem ele. */
export async function cookieValue(page: Page, name: string): Promise<string | null> {
  const cookie = (await page.context().cookies()).find((item) => item.name === name);
  return cookie?.value ?? null;
}
