import { expect, test as base } from '@playwright/test';
import { common } from '../fixtures/common';
import { ApiHandlers, MockApi, mockApi } from './api';
import { seedSession, SessionProvider } from './session';
import { OAUTH_SERVER_PROJECT, serviceRequests, setServiceScenario } from './service';
import { checkResponse } from './contract';
import { followOAuthRedirectsInPage } from './oauth';

/**
 * Teste base das páginas: grava o idioma, semeia a sessão fake (sem ela com `test.use({ session: false })`) e simula a
 * API com os handlers comuns mais os do cenário (`test.use({ scenario })`). No fim, falha se alguma rota foi pedida sem
 * handler ou se alguma resposta simulada não bate com o schema do Service (e2e/support/contract.ts). No projeto
 * `oauth-servidor` (um teste por vez), as rotas que o servidor do Next pede ao Service (OAuth, troca do code, logout) vão
 * para o Service fake, e as respostas dele passam pela mesma conferência.
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
      // o Service fake é um só para todos os testes: só no oauth-servidor (um por vez) os pedidos são deste teste
      if (testInfo.project.name === OAUTH_SERVER_PROJECT) {
        for (const { method, path, status, response } of await serviceRequests()) {
          const check = checkResponse(method, path.replace(/\/$/, ''), status, response);
          if (check.error) api.contract.push(`Service fake: ${check.error}`);
          if (check.uncovered) api.uncovered.add(check.uncovered);
        }
      }
      for (const route of api.uncovered) testInfo.annotations.push({ type: 'sem-contrato', description: route });
      expect(api.unhandled, 'rotas da API pedidas sem handler').toEqual([]);
      expect([...new Set(api.contract)], 'respostas simuladas fora do contrato do Service').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
