import { expect, test as base } from '@playwright/test';
import { common } from '../fixtures/common';
import { ApiHandlers, MockApi, mockApi } from './api';
import { seedSession } from './session';

/**
 * Teste base das páginas autenticadas: semeia a sessão fake e simula a API com os handlers comuns mais os do cenário
 * (`test.use({ scenario })`). No fim, falha se alguma rota foi pedida sem handler.
 */
export const test = base.extend<{ scenario: ApiHandlers; api: MockApi }>({
  scenario: [{}, { option: true }],
  api: [
    async ({ page, scenario }, use) => {
      await seedSession(page);
      const api = await mockApi(page, { ...common, ...scenario });
      await use(api);
      expect(api.unhandled, 'rotas da API pedidas sem handler').toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };
