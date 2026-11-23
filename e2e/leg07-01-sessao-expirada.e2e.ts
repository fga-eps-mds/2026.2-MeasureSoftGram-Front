import { expect, test } from './support/fixtures';
import { PRODUCT_API, PRODUCT_PATH } from './fixtures/common';
import { SESSION_COOKIES } from './support/session';

/**
 * US007 de 2026.1 (Front#10 e #13, "Notificar sessão expirada"): o Service recusa o token (HTTP 401) no meio do uso e a
 * tela avisa e leva ao login. Hoje o aviso aparece já na tela de login, depois do redirect (sem modal para fechar antes).
 */
const EXPIRED = 'Sua sessão expirou. Entre novamente.';
const REPOSITORIES_API = `${PRODUCT_API}/repositories/`;

test.describe('@LEG07.01-CA1 Resposta 401 da API: aviso de sessão expirada e volta ao login', () => {
  test.use({ scenario: { [REPOSITORIES_API]: { status: 401, json: { detail: 'Token inválido.' } } } });

  test('mostra o aviso na tela de login, com o retorno para a tela de onde saiu', async ({ page, api }) => {
    const release = api.hold(REPOSITORIES_API);
    await page.goto(`${PRODUCT_PATH}/repositories/`);
    // o token expirou também para o servidor do Next: sem isso, o /auth devolveria o usuário logado para a tela
    await page.context().clearCookies({ name: SESSION_COOKIES.token });
    release();
    await expect(page).toHaveURL(/\/auth\/?\?returnTo=%2Fproducts%2F/);
    await expect(page.getByText(EXPIRED)).toBeVisible();
  });
});
