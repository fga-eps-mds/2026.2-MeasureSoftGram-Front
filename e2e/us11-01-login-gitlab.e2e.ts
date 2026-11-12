import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { cookieValue, SESSION_COOKIES } from './support/session';
import { OAUTH_SERVER_TAG, waitForServiceRequest } from './support/service';
import { PRODUCT_PATH } from './fixtures/common';
import { GITLAB_TOKEN, LOGIN_API, login400, login502, loginOk, validateFalha } from './fixtures/login-gitlab';

// o login começa sem sessão
test.use({ session: false });

const USERNAME = 'usuario-mock';
const EXPIRED = 'Sua sessão expirou. Por favor, faça login novamente!';
const TECHNICAL_DETAIL = /\b(400|500|502)\b|Request failed|status code|Bad Gateway|Erro interno/;
/** A página pública ("/") ou o login ("/auth", com o returnTo da tela pedida), para onde o proxy manda sem sessão. */
const PUBLIC_PAGE = /^http:\/\/localhost:\d+\/(auth\/?(\?returnTo=[^&]+)?)?$/;

/** Telas autenticadas de src/app/(dashboard): sem a sessão, o proxy manda todas para o login. */
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
  '/products/create/',
  ...['overview', 'metamodelo', 'entidade', 'distribuicao', 'relacoes', 'temporal'].map(
    (dashboard) => `${PRODUCT_PATH}/dashboards/${dashboard}/`
  )
];

/** O botão mostra "LOGIN COM GITLAB" em maiúsculas; o CA diz "Login com GitLab". */
const loginButton = (page: Page) => page.getByRole('button', { name: /login com gitlab/i });

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

/** A conta da sessão: o /bff pede ao Service a conta do token guardado no cookie. */
const storedAccount = async (page: Page) => {
  // page.request leva os cookies da página e não passa pelo page.route
  const { id, username } = await (await page.request.get('/bff/v1/accounts/')).json();
  return { id, username };
};

/** O token que o Service devolveu no último login com o GitLab. */
const lastLoginKey = async () => (await waitForServiceRequest(LOGIN_API.login)).response.key as string;

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
  await expect.poll(() => cookieValue(page, SESSION_COOKIES.token)).toBeNull();
}

/** Abre cada rota numa aba nova do mesmo navegador (mesma sessão) e confere que ela manda para a página pública. */
async function expectRedirectsToPublicPage(page: Page, routes: string[]) {
  await Promise.all(
    routes.map(async (route) => {
      const tab = await page.context().newPage();
      // a aba nova não tem os handlers do teste: sem token, o Service recusaria qualquer pedido
      await tab.route('**/bff/v1/**', (request) =>
        request.fulfill({ status: 401, json: { detail: 'Sem credenciais.' } })
      );
      await tab.goto(route);
      await expect(tab, route).toHaveURL(PUBLIC_PAGE);
      await expect(tab.getByTestId('side-menu'), route).toBeHidden();
      await tab.close();
    })
  );
}

test.describe('@US11.01-CA1 Botão "Login com GitLab" na tela de login', { tag: OAUTH_SERVER_TAG }, () => {
  test.use({ scenario: loginOk });

  test('a tela de login, sem sessão, mostra o botão habilitado', async ({ page }) => {
    await page.goto('/auth/');
    await expect(loginButton(page)).toBeVisible();
    await expect(loginButton(page)).toBeEnabled();
  });
});

test.describe('@US11.01-CA2 Autorizar no GitLab entra logado na página inicial', { tag: OAUTH_SERVER_TAG }, () => {
  test.use({ scenario: loginOk });

  test('o botão valida o client id e leva à autorização oficial do GitLab', async ({ page, baseURL }) => {
    await gitlabAnswers(page, { code: 'e2e' });
    await page.goto('/auth/');
    const [authorize] = await Promise.all([
      page.waitForRequest(/^https:\/\/gitlab\.com\/oauth\/authorize\?/),
      loginButton(page).click()
    ]);

    // quem valida o client id é o servidor do Next, antes de mandar o navegador ao GitLab
    const validate = await waitForServiceRequest(LOGIN_API.validate);
    expect(validate.body).toEqual({ client_id: 'e2e-gitlab' });
    const params = new URL(authorize.url()).searchParams;
    expect(params.get('client_id')).toBe('e2e-gitlab');
    expect(params.get('redirect_uri')).toBe(`${baseURL}/`);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  test('ao autorizar, troca o code pelo token e abre a página inicial com o usuário do GitLab', async ({ page }) => {
    await gitlabAnswers(page, { code: 'e2e' });
    await page.goto('/auth/');
    await loginButton(page).click();

    // a troca do code e a consulta da conta saem do servidor do Next; o token fica no cookie HttpOnly
    const login = await waitForServiceRequest(LOGIN_API.login);
    expect(login.body).toEqual({ code: 'e2e' });
    expect(login.response.key).toMatch(new RegExp(`^${GITLAB_TOKEN}`));
    await waitForServiceRequest('/v1/accounts/', (request) => request.authorization === `Token ${login.response.key}`);
    await expect(page.getByText('Login realizado com sucesso!')).toBeVisible();
    await expect(page).toHaveURL(/\/home\/?$/);
    // nome e e-mail não aparecem em nenhuma tela do Front: o menu lateral mostra o username
    await expect(page.getByText(USERNAME, { exact: true })).toBeVisible();
  });
});

test.describe('@US11.01-CA3 Entrar com o GitLab abre a conta existente, sem perfil duplicado', { tag: OAUTH_SERVER_TAG }, () => {
  test.use({ scenario: loginOk });

  // Quem reaproveita a conta (e não cria outro perfil para o mesmo usuário do GitLab) é o Service. O Front prova a parte
  // dele: dois logins seguidos com o mesmo usuário do GitLab abrem a mesma conta, com o mesmo id e o mesmo username.
  test('dois logins seguidos com o mesmo usuário do GitLab caem na mesma conta', async ({ page }) => {
    await loginWithGitlab(page);
    const first = await storedAccount(page);
    expect(first).toEqual({ id: 1, username: USERNAME });

    await finishSession(page);
    await loginWithGitlab(page);
    const key = await lastLoginKey();

    expect(key).toMatch(new RegExp(`^${GITLAB_TOKEN}`));
    await waitForServiceRequest('/v1/accounts/', (request) => request.authorization === `Token ${key}`);
    expect(await storedAccount(page)).toEqual(first);
    await expect(sideMenuUser(page)).toBeVisible();
  });
});

test.describe('@US11.01-CA4 Cancelar no GitLab volta ao login com "Login cancelado"', { tag: OAUTH_SERVER_TAG }, () => {
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

test.describe('@US11.01-CA5 Falha, sessão expirada ou GitLab fora do ar: mensagem sem detalhe técnico e nova tentativa', { tag: OAUTH_SERVER_TAG }, () => {
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
      // o início da sessão fica no cookie que o login gravou
      await page
        .context()
        .addCookies([{ name: SESSION_COOKIES.loginAt, value: String(Date.now() - 121 * 60 * 1000), url: new URL('/', page.url()).toString() }]);
      await page.reload();
      await expect(page.getByText(EXPIRED)).toBeVisible();
    });
  });
});

test.describe('@US11.01-CA6 "Finalizar Sessão" no menu do usuário encerra a sessão', { tag: OAUTH_SERVER_TAG }, () => {
  test.use({ scenario: loginOk });

  test('encerra a sessão no Service e volta à página pública', async ({ page }) => {
    await loginWithGitlab(page);
    await sideMenuUser(page).click();
    const key = await lastLoginKey();
    await page.getByRole('menuitem', { name: 'Finalizar Sessão' }).click();

    // o /bff/session encerra a sessão no Service com o token do cookie
    const logout = await waitForServiceRequest(LOGIN_API.logout);
    expect(logout.method).toBe('DELETE');
    expect(logout.authorization).toBe(`Token ${key}`);
    await expect(page.getByText('Volte logo para acompanhar seus produtos!')).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect
      .poll(async () => [await cookieValue(page, SESSION_COOKIES.token), await cookieValue(page, SESSION_COOKIES.provider)])
      .toEqual([null, null]);
  });

  test('depois de sair, as telas autenticadas voltam à página pública', async ({ page }) => {
    await loginWithGitlab(page);
    await finishSession(page);
    await expectRedirectsToPublicPage(page, PROTECTED_ROUTES);
  });
});
