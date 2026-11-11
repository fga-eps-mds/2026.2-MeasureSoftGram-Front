import { Page, Request } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import { GITLAB_TOKEN, LOGIN_API, login400, login502, loginOk, validateFalha } from './fixtures/login-gitlab';

// o login começa sem sessão
test.use({ session: false });

const USERNAME = 'usuario-mock';
const EXPIRED = 'Sua sessão expirou. Por favor, faça login novamente!';
const TECHNICAL_DETAIL = /\b(400|500|502)\b|Request failed|status code|Bad Gateway|Erro interno/;
/** A página pública ("/", pelo useRequireAuth) ou o login ("/auth", pelo 401 do Service tratado em services/api.ts). */
const PUBLIC_PAGE = /^http:\/\/localhost:\d+\/(auth\/?)?$/;

/**
 * Telas autenticadas de src/pages. As que chamam useRequireAuth voltam a "/"; as outras (organizações, releases,
 * repositórios) não têm o hook e só saem porque pedem a API e o 401 do Service manda para /auth.
 */
const PROTECTED_ROUTES = [
  '/home/',
  '/about/',
  '/config/',
  '/organizations/',
  '/products/',
  `${PRODUCT_PATH}/`,
  `${PRODUCT_PATH}/settings/`,
  `${PRODUCT_PATH}/releases/`,
  `${PRODUCT_PATH}/releases/1/`,
  `${PRODUCT_PATH}/releases/create/`,
  `${PRODUCT_PATH}/repositories/`,
  `${PRODUCT_PATH}/repositories/1/`,
  `${PRODUCT_PATH}/repositories/manage-repository/`,
  ...['overview', 'metamodelo', 'entidade', 'distribuicao', 'relacoes', 'temporal'].map(
    (dashboard) => `${PRODUCT_PATH}/dashboards/${dashboard}/`
  )
];

/** Sem useRequireAuth e sem pedir a API ao abrir: o formulário de novo produto continua na tela depois do logout. */
const UNPROTECTED_ROUTES = ['/products/create/'];

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

/** O usuário no rodapé do menu lateral, que abre o menu com "Finalizar Sessão". */
const sideMenuUser = (page: Page) => page.getByTestId('side-menu').getByText(USERNAME, { exact: true });

/** A conta que o Front guardou na sessão. */
const storedAccount = (page: Page) =>
  page.evaluate(() => {
    const { id, username } = JSON.parse(localStorage.getItem('session') ?? 'null') ?? {};
    return { id, username };
  });

/** Entra pelo GitLab (autorizando) e espera a página inicial com o usuário no menu. */
async function loginWithGitlab(page: Page) {
  await gitlabAnswers(page, { code: 'e2e' });
  await page.goto('/auth/');
  await loginButton(page).click();
  await expect(page).toHaveURL(/\/home\/?$/);
  await expect(sideMenuUser(page)).toBeVisible();
}

/** "Finalizar Sessão" pelo menu do usuário no menu lateral; espera a sessão sumir do navegador. */
async function finishSession(page: Page) {
  await sideMenuUser(page).click();
  await page.getByRole('menuitem', { name: 'Finalizar Sessão' }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();
}

/** Abre cada rota numa aba nova do mesmo navegador (mesma sessão) e confere que ela manda para a página pública. */
async function expectRedirectsToPublicPage(page: Page, routes: string[]) {
  await Promise.all(
    routes.map(async (route) => {
      const tab = await page.context().newPage();
      // a aba nova não tem os handlers do teste: sem token, o Service recusaria qualquer pedido
      await tab.route('**/api/v1/**', (request) =>
        request.fulfill({ status: 401, json: { detail: 'Sem credenciais.' } })
      );
      await tab.goto(route);
      await expect(tab, route).toHaveURL(PUBLIC_PAGE);
      await expect(tab.getByTestId('side-menu'), route).toBeHidden();
      await tab.close();
    })
  );
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

test.describe('@US11.01-CA3 Entrar com o GitLab abre a conta existente, sem perfil duplicado', () => {
  test.use({ scenario: loginOk });

  // Quem reaproveita a conta (e não cria outro perfil para o mesmo usuário do GitLab) é o Service. O Front prova a parte
  // dele: dois logins seguidos com o mesmo usuário do GitLab abrem a mesma conta, com o mesmo id e o mesmo username.
  test('dois logins seguidos com o mesmo usuário do GitLab caem na mesma conta', async ({ page }) => {
    await loginWithGitlab(page);
    const first = await storedAccount(page);
    expect(first).toEqual({ id: 1, username: USERNAME });

    await finishSession(page);
    const [account] = await Promise.all([page.waitForRequest(apiRequest('/v1/accounts/')), loginWithGitlab(page)]);

    expect(account.headers().authorization).toBe(`Token ${GITLAB_TOKEN}`);
    expect(await storedAccount(page)).toEqual(first);
    await expect(sideMenuUser(page)).toBeVisible();
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
      await expect(page.getByText(EXPIRED)).toBeVisible();
      await expect(page.getByText('Volte para o login e tente novamente.')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(TECHNICAL_DETAIL);
      await page.getByRole('button', { name: 'Voltar para o Login' }).click();
      await expect(page).toHaveURL(/\/auth\/?$/);
      await expect(loginButton(page)).toBeEnabled();
    });

    test('mostra "Sua sessão expirou. Por favor, faça login novamente!"', async ({ page }) => {
      await page.goto('/auth/');
      await loginButton(page).click();
      await expect(page.getByText(EXPIRED)).toBeVisible();
    });
  });

  test.describe('o Service recusa o code do GitLab (400)', () => {
    test.use({ scenario: login400 });

    test('mostra "Sua sessão expirou. Por favor, faça login novamente!" e volta ao login', async ({ page }) => {
      await gitlabAnswers(page, { code: 'e2e' });
      await page.goto('/auth/');
      await loginButton(page).click();
      await expect(page.getByText(EXPIRED)).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/?$/);
      await expect(loginButton(page)).toBeEnabled();
    });
  });

  test.describe('o GitLab está fora do ar (502 ao trocar o code)', () => {
    test.use({ scenario: login502 });

    test('mostra "Sua sessão expirou. Por favor, faça login novamente!" sem detalhe técnico e volta ao login', async ({
      page
    }) => {
      await gitlabAnswers(page, { code: 'e2e' });
      await page.goto('/auth/');
      await loginButton(page).click();
      await expect(page.getByText(EXPIRED)).toBeVisible();
      await expect(page.locator('body')).not.toContainText(TECHNICAL_DETAIL);
      await expect(page).toHaveURL(/\/auth\/?$/);
      await expect(loginButton(page)).toBeEnabled();
    });
  });

  test.describe('a sessão passou de 2 h', () => {
    test.use({ scenario: loginOk });

    test('mostra "Sua sessão expirou. Por favor, faça login novamente!"', async ({ page }) => {
      await loginWithGitlab(page);
      await page.evaluate(() => localStorage.setItem('login_timestamp', String(Date.now() - 121 * 60 * 1000)));
      await page.reload();
      await expect(page.getByText(EXPIRED)).toBeVisible();
    });
  });
});

test.describe('@US11.01-CA6 "Finalizar Sessão" no menu do usuário encerra a sessão', () => {
  test.use({ scenario: loginOk });

  test('encerra a sessão no Service e volta à página pública', async ({ page }) => {
    await loginWithGitlab(page);
    await sideMenuUser(page).click();
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
    await finishSession(page);
    await expectRedirectsToPublicPage(page, PROTECTED_ROUTES);
  });

  test.fixme(
    'depois de sair, o cadastro de produto também volta à página pública (bug: abre sem sessão)',
    async ({ page }) => {
      await loginWithGitlab(page);
      await finishSession(page);
      await expectRedirectsToPublicPage(page, UNPROTECTED_ROUTES);
    }
  );
});
