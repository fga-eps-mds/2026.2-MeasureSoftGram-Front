import { expect, test as base } from '@playwright/test';
import { common } from '../fixtures/common';
import { ApiHandlers, MockApi, mockApi } from './api';
import { seedSession, SessionProvider } from './session';

/**
 * Teste base das páginas: grava o idioma, semeia a sessão fake (sem ela com `test.use({ session: false })`) e simula a
 * API com os handlers comuns mais os do cenário (`test.use({ scenario })`). No fim, falha se alguma rota foi pedida sem
 * handler.
 */
export const test = base.extend<{ scenario: ApiHandlers; provider: SessionProvider; session: boolean; api: MockApi }>({
  scenario: [{}, { option: true }],
  provider: ['credentials', { option: true }],
  session: [true, { option: true }],
  api: [
    async ({ page, scenario, provider, session }, use) => {
      // sem idioma salvo o app abre em inglês; os critérios estão em português
      await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
      if (session) await seedSession(page, provider);
      const api = await mockApi(page, { ...common, ...scenario });
      await use(api);
      expect(api.unhandled, 'rotas da API pedidas sem handler').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
