import { Page, Request } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import { GITLAB_TOKEN, LOGIN_API, login400, login502, loginOk, validateFalha } from './fixtures/login-gitlab';

// o login começa sem sessão
test.use({ session: false });

const USERNAME = 'usuario-mock';
const EXPIRED = 'Sua sessão expirou. Por favor, faça login novamente!';
const TECHNICAL_DETAIL = /\b(400|500|502)\b|Request failed|status code|Bad Gateway|Erro interno/;

/** O botão mostra "LOGIN COM GITLAB" em maiúsculas; o CA diz "Login com GitLab". */
const loginButton = (page: Page) => page.getByRole('button', { name: /login com gitlab/i });

/** Pedido do navegador a uma rota da API simulada (caminho a partir de /v1). */
const apiRequest = (path: string) => (request: Request) => new URL(request.url()).pathname === `/api${path}`;

/**
 * O GitLab simulado: devolve o navegador ao redirect_uri com o state que o Front mandou, mais o code (Authorize) ou o
 * error (Deny).
 */
async function gitlabAnswers(page: Page, answer: { code: string } | { error: string }) {
  await page.route('https://gitlab.com/**', (route) => {
    const authorize = new URL(route.request().url());
    const callback = new URL(authorize.searchParams.get('redirect_uri') ?? '');
    callback.search = new URLSearchParams({ ...answer, state: authorize.searchParams.get('state') ?? '' }).toString();
    return route.fulfill({ status: 302, headers: { location: callback.toString() } });
  });
}

/** Entra pelo GitLab (autorizando) e espera a página inicial com o usuário no menu. */
async function loginWithGitlab(page: Page) {
  await gitlabAnswers(page, { code: 'e2e' });
  await page.goto('/auth/');
  await loginButton(page).click();
  await expect(page).toHaveURL(/\/home\/?$/);
  await expect(page.getByText(USERNAME, { exact: true })).toBeVisible();
}

test.describe('@US11.01-CA1 Botão "Login com GitLab" na tela de login', () => {
  test.use({ scenario: loginOk });

  test('a tela de login, sem sessão, mostra o botão habilitado', async ({ page }) => {
    await page.goto('/auth/');
    await expect(loginButton(page)).toBeVisible();
    await expect(loginButton(page)).toBeEnabled();
  });
});

test.describe('@US11.01-CA2 Autorizar no GitLab entra logado na página inicial', () => {
  test.use({ scenario: loginOk });

  test('o botão valida o client id e leva à autorização oficial do GitLab', async ({ page, baseURL }) => {
    await gitlabAnswers(page, { code: 'e2e' });
    await page.goto('/auth/');
    const [validate, authorize] = await Promise.all([
      page.waitForRequest(apiRequest(LOGIN_API.validate)),
      page.waitForRequest(/^https:\/\/gitlab\.com\/oauth\/authorize\?/),
      loginButton(page).click()
    ]);

    expect(validate.postDataJSON()).toEqual({ client_id: 'e2e-gitlab' });
    const params = new URL(authorize.url()).searchParams;
    expect(params.get('client_id')).toBe('e2e-gitlab');
    expect(params.get('redirect_uri')).toBe(`${baseURL}/`);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  test('ao autorizar, troca o code pelo token e abre a página inicial com o usuário do GitLab', async ({ page }) => {
    await gitlabAnswers(page, { code: 'e2e' });
    await page.goto('/auth/');
    const [login, account] = await Promise.all([
      page.waitForRequest(apiRequest(LOGIN_API.login)),
      page.waitForRequest(apiRequest('/v1/accounts/')),
      loginButton(page).click()
    ]);

    expect(login.postDataJSON()).toEqual({ code: 'e2e' });
    expect(account.headers().authorization).toBe(`Token ${GITLAB_TOKEN}`);
    await expect(page.getByText('Login realizado com sucesso!')).toBeVisible();
    await expect(page).toHaveURL(/\/home\/?$/);
    // nome e e-mail não aparecem em nenhuma tela do Front: o menu lateral mostra o username
    await expect(page.getByText(USERNAME, { exact: true })).toBeVisible();
  });
});

test.describe('@US11.01-CA4 Cancelar no GitLab volta ao login com "Login cancelado"', () => {
  test.use({ scenario: loginOk });

  test('o "Deny" do GitLab (error=access_denied) volta a /auth com o aviso', async ({ page }) => {
    await gitlabAnswers(page, { error: 'access_denied' });
    await page.goto('/auth/');
    await loginButton(page).click();

    await expect(page.getByText('Login cancelado')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/?$/);
    await expect(loginButton(page)).toBeEnabled();
  });
});

test.describe('@US11.01-CA5 Falha, sessão expirada ou GitLab fora do ar: mensagem sem detalhe técnico e nova tentativa', () => {
  test.describe('o Service não valida o client id', () => {
    test.use({ scenario: validateFalha });

    test('leva a /auth/error sem detalhe técnico, e "Voltar para o Login" reabre o login', async ({ page }) => {
      await page.goto('/auth/');
      await loginButton(page).click();

      await expect(page).toHaveURL(/\/auth\/error\/?$/);
      await expect(page.getByText('Ops! Problema no redirecionamento')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(TECHNICAL_DETAIL);
      await page.getByRole('button', { name: 'Voltar para o Login' }).click();
      await expect(page).toHaveURL(/\/auth\/?$/);
      await expect(loginButton(page)).toBeEnabled();
    });

    test.fixme(
      'mostra "Sua sessão expirou. Por favor, faça login novamente!" (bug: mostra "Ops! Problema no redirecionamento")',
      async ({ page }) => {
        await page.goto('/auth/');
        await loginButton(page).click();
        await expect(page.getByText(EXPIRED)).toBeVisible();
      }
    );
  });

  test.describe('o Service recusa o code do GitLab (400)', () => {
    test.use({ scenario: login400 });

    test.fixme(
      'mostra "Sua sessão expirou. Por favor, faça login novamente!" e volta ao login (bug: mostra "Erro ao realizar login: <mensagem do Service>" e fica em "Autenticando no MeasureSoftGram...")',
      async ({ page }) => {
        await gitlabAnswers(page, { code: 'e2e' });
        await page.goto('/auth/');
        await loginButton(page).click();
        await expect(page.getByText(EXPIRED)).toBeVisible();
        await expect(page).toHaveURL(/\/auth\/?$/);
        await expect(loginButton(page)).toBeEnabled();
      }
    );
  });

  test.describe('o GitLab está fora do ar (502 ao trocar o code)', () => {
    test.use({ scenario: login502 });

    test.fixme(
      'mostra "Sua sessão expirou. Por favor, faça login novamente!" sem detalhe técnico e volta ao login (bug: mostra "Erro ao realizar login: Request failed with status code 502" e fica em "Autenticando no MeasureSoftGram...")',
      async ({ page }) => {
        await gitlabAnswers(page, { code: 'e2e' });
        await page.goto('/auth/');
        await loginButton(page).click();
        await expect(page.getByText(EXPIRED)).toBeVisible();
        await expect(page.locator('body')).not.toContainText(TECHNICAL_DETAIL);
        await expect(page).toHaveURL(/\/auth\/?$/);
        await expect(loginButton(page)).toBeEnabled();
      }
    );
  });

  test.describe('a sessão passou de 2 h', () => {
    test.use({ scenario: loginOk });

    test.fixme(
      'mostra "Sua sessão expirou. Por favor, faça login novamente!" (bug: mostra "Sua sessão expirou por segurança (limite de 2h).")',
      async ({ page }) => {
        await loginWithGitlab(page);
        await page.evaluate(() => localStorage.setItem('login_timestamp', String(Date.now() - 121 * 60 * 1000)));
        await page.reload();
        await expect(page.getByText(EXPIRED)).toBeVisible();
      }
    );
  });
});

test.describe('@US11.01-CA6 "Finalizar Sessão" no menu do usuário encerra a sessão', () => {
  test.use({ scenario: loginOk });

  test('encerra a sessão no Service e volta à página pública', async ({ page }) => {
    await loginWithGitlab(page);
    await page.getByText(USERNAME, { exact: true }).click();
    const [logout] = await Promise.all([
      page.waitForRequest(apiRequest(LOGIN_API.logout)),
      page.getByRole('menuitem', { name: 'Finalizar Sessão' }).click()
    ]);

    expect(logout.method()).toBe('DELETE');
    await expect(page.getByText('Volte logo para acompanhar seus produtos!')).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect
      .poll(() => page.evaluate(() => [localStorage.getItem('token'), localStorage.getItem('session')]))
      .toEqual([null, null]);
  });

  test('depois de sair, as telas autenticadas voltam à página pública', async ({ page }) => {
    await loginWithGitlab(page);
    await page.getByText(USERNAME, { exact: true }).click();
    await page.getByRole('menuitem', { name: 'Finalizar Sessão' }).click();
    await expect(page).toHaveURL('/');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();

    await page.goto('/home/');
    await expect(page.getByText('Usuário(a) não autenticado(a). Por favor, realize o login.')).toBeVisible();
    await expect(page).toHaveURL('/');

    await page.goto(`${PRODUCT_PATH}/`);
    await expect(page.getByText('Usuário(a) não autenticado(a). Por favor, realize o login.')).toBeVisible();
    await expect(page).toHaveURL('/');
  });
});
