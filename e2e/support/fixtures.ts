import { expect, test as base } from '@playwright/test';
import { common } from '../fixtures/common';
import { ApiHandlers, MockApi, mockApi } from './api';
import { seedSession, SessionProvider } from './session';
import { OAUTH_SERVER_PROJECT, setServiceScenario } from './service';
import { followOAuthRedirectsInPage } from './oauth';

/**
 * Teste base das páginas: grava o idioma, semeia a sessão fake (sem ela com `test.use({ session: false })`) e simula a
 * API com os handlers comuns mais os do cenário (`test.use({ scenario })`). No fim, falha se alguma rota foi pedida sem
 * handler. No projeto `oauth-servidor` (um teste por vez), as rotas que o servidor do Next pede ao Service (OAuth, troca
 * do code, logout) vão para o Service fake.
 */
export const test = base.extend<{ scenario: ApiHandlers; provider: SessionProvider; session: boolean; api: MockApi }>({
  scenario: [{}, { option: true }],
  provider: ['credentials', { option: true }],
  session: [true, { option: true }],
  api: [
    async ({ page, scenario, provider, session, baseURL }, use, testInfo) => {
      // sem idioma salvo o app abre em inglês; os critérios estão em português
      await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
      if (testInfo.project.name === OAUTH_SERVER_PROJECT) await setServiceScenario(scenario);
      if (session) await seedSession(page, baseURL as string, provider);
      // o redirect do servidor para o provedor vira navegação da página, que o page.route do provedor intercepta
      await followOAuthRedirectsInPage(page);
      const api = await mockApi(page, { ...common, ...scenario });
      await use(api);
      expect(api.unhandled, 'rotas da API pedidas sem handler').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
