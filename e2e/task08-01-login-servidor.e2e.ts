import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { cookieValue, SESSION_COOKIES } from './support/session';
import { OAUTH_SERVER_TAG } from './support/service';
import { ORGANIZATION_ID, PRODUCT_ID, PRODUCT_PATH } from './fixtures/common';
import * as repositorio from './fixtures/repositorio';
import * as overview from './fixtures/overview';
import * as produto from './fixtures/produto';
import {
  grupoComNomeDoUsuario,
  IMPORT_PATH,
  JOAO_GROUP,
  JOAO_PERSONAL_ORGANIZATION
} from './fixtures/importacao-gitlab';
import {
  githubSession,
  LEGACY_TOKEN_KEY,
  loginOk,
  Provider,
  PROVIDERS,
  PRIVATE_PATH,
  SERVICE_DOWN_TOKEN
} from './fixtures/login-servidor';

/**
 * TASK08.01 (Front#99): o login no servidor do Next 16. O GitHub e o GitLab são simulados (o login nos provedores reais é
 * validado à mão), mas o resto é o caminho de verdade: o proxy, o /auth/oauth, o cookie do state, o /bff/session e os
 * cookies HttpOnly da sessão, com o Service fake de e2e/support/mock-service.mjs.
 */

const LABEL: Record<Provider, string> = { github: 'GitHub', gitlab: 'GitLab' };
const FAREWELL = 'Volte logo para acompanhar seus produtos!';
/** O toast do useRequireAuth, que a proteção de rota no navegador mostrava antes da migração. */
const UNAUTHENTICATED = /não autenticad/i;
const REPOSITORY_TITLE = 'MeasureSoftGram-Service';

/** O botão mostra "LOGIN COM <PROVEDOR>" em maiúsculas. */
const loginButton = (page: Page, provider: Provider) =>
  page.getByRole('button', { name: new RegExp(`login com ${provider}`, 'i') });

const sideMenu = (page: Page) => page.getByTestId('side-menu');

/** O provedor simulado: devolve o navegador ao redirect_uri com o state que o Front mandou, mais o code ou o error. */
async function providerAnswers(page: Page, provider: Provider, answer: { code: string } | { error: string }) {
  const host = provider === 'github' ? 'https://github.com/**' : 'https://gitlab.com/**';
  await page.route(host, (route) => {
    const authorize = new URL(route.request().url());
    const callback = new URL(authorize.searchParams.get('redirect_uri') ?? '');
    callback.search = new URLSearchParams({ ...answer, state: authorize.searchParams.get('state') ?? '' }).toString();
    return route.fulfill({ status: 302, headers: { location: callback.toString() } });
  });
}

/** Caminho (sem a barra final do trailingSlash) e query da página, para comparar com o destino do returnTo. */
const pathAndQuery = (page: Page) => {
  const url = new URL(page.url());
  return `${url.pathname.replace(/\/$/, '')}${url.search}`;
};

/**
 * Erros de hidratação, do React e do ECharts no console ou como exceção da página. No build de produção o React só
 * mostra o código do erro: 418 a 425 são os de hidratação.
 */
const HYDRATION_OR_CHART_ERROR =
  /hydrat|did not match|Minified React error #(418|419|420|421|422|423|424|425)\b|react\.dev\/errors\/(418|419|420|421|422|423|424|425)\b|\[ECharts\]|tslib/i;

function watchHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()) && HYDRATION_OR_CHART_ERROR.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (HYDRATION_OR_CHART_ERROR.test(`${error.message}\n${error.stack ?? ''}`)) errors.push(error.message);
  });
  return errors;
}

test.describe(
  '@TASK08.01-CA1 Rota privada sem sessão vai ao login e, depois de entrar, volta para ela',
  { tag: OAUTH_SERVER_TAG },
  () => {
    test.use({ session: false, scenario: { ...loginOk, ...repositorio.comDados } });

    test('o servidor responde com o redirect para /auth, com o returnTo, sem entregar a página privada', async ({
      page
    }) => {
      // page.request leva os cookies da página (nenhum) e não segue o redirect
      const response = await page.request.get(PRIVATE_PATH, { maxRedirects: 0 });

      expect(response.status()).toBe(307);
      const location = new URL(response.headers().location, 'http://localhost');
      expect(location.pathname).toMatch(/^\/auth\/?$/);
      expect(location.searchParams.get('returnTo')).toBe(PRIVATE_PATH);
      expect(await response.text()).not.toContain(REPOSITORY_TITLE);
    });

    for (const provider of PROVIDERS) {
      test(`${LABEL[provider]}: depois do login, abre a rota privada que tinha sido pedida, com a query`, async ({
        page
      }) => {
        await providerAnswers(page, provider, { code: 'e2e' });
        await page.goto(PRIVATE_PATH);
        await expect(page).toHaveURL(/\/auth\/?\?returnTo=/);
        await expect(sideMenu(page)).toBeHidden();

        await loginButton(page, provider).click();

        await expect(page.getByRole('heading', { name: REPOSITORY_TITLE })).toBeVisible();
        expect(pathAndQuery(page)).toBe(PRIVATE_PATH);
      });
    }
  }
);

test.describe(
  '@TASK08.01-CA2 Login: só a tela de carregamento, sem botões e sem a landing, e entra no destino',
  { tag: OAUTH_SERVER_TAG },
  () => {
    test.use({ session: false, scenario: loginOk });

    for (const provider of PROVIDERS) {
      test(`${LABEL[provider]}: a volta do provedor mostra só o carregamento e a sessão fica no cookie HttpOnly`, async ({
        page
      }) => {
        await providerAnswers(page, provider, { code: 'e2e' });
        const visited: string[] = [];
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
        });
        // segura o /bff/session para a tela de carregamento ficar na tela o tempo que o teste precisar
        let release = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/bff/session', async (route) => {
          await gate;
          await route.continue();
        });

        await page.goto('/auth/');
        await loginButton(page, provider).click();

        await expect(page).toHaveURL(/\/auth\/callback\/?\?code=e2e&state=[0-9a-f]{32}$/);
        await expect(page.getByRole('status')).toContainText('Autenticando no MeasureSoftGram...');
        await expect(page.getByRole('button')).toHaveCount(0);
        release();

        await expect(page).toHaveURL(/\/home\/?$/);
        await expect(page.getByText('Login realizado com sucesso!')).toBeVisible();
        // a volta do provedor ("/?code=...") é redirecionada pelo proxy antes de a landing renderizar
        expect(visited.filter((path) => path === '/' || path.startsWith('/landing'))).toEqual([]);

        const cookies = await page.context().cookies();
        const token = cookies.find((cookie) => cookie.name === SESSION_COOKIES.token);
        expect(token).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
        expect(token?.value).toMatch(new RegExp(`^e2e-token-${provider}`));
        expect(await cookieValue(page, SESSION_COOKIES.provider)).toBe(provider);
        // o JavaScript da página não lê o token: nem no localStorage, nem em document.cookie
        const visibleToPage = await page.evaluate(() => `${JSON.stringify(localStorage)} ${document.cookie}`);
        expect(visibleToPage).not.toContain(token?.value as string);
      });
    }
  }
);

test.describe(
  '@TASK08.01-CA3 Cancelar no provedor volta para /auth com "Login cancelado"',
  { tag: OAUTH_SERVER_TAG },
  () => {
    test.use({ session: false, scenario: loginOk });

    for (const provider of PROVIDERS) {
      test(`${LABEL[provider]}: error=access_denied volta ao login com o aviso e os botões habilitados`, async ({
        page
      }) => {
        await providerAnswers(page, provider, { error: 'access_denied' });
        await page.goto('/auth/');
        await loginButton(page, provider).click();

        await expect(page.getByText('Login cancelado')).toBeVisible();
        await expect(page).toHaveURL(/\/auth\/?$/);
        await expect(loginButton(page, provider)).toBeEnabled();
        expect(await cookieValue(page, SESSION_COOKIES.token)).toBeNull();
      });
    }
  }
);

test.describe(
  '@TASK08.01-CA4 Logout vai para a página inicial com a despedida, sem "não autenticado"',
  { tag: OAUTH_SERVER_TAG },
  () => {
    test.use({ session: false, scenario: loginOk });

    test('"Finalizar Sessão" mostra a despedida na página inicial e nenhum aviso de usuário não autenticado', async ({
      page
    }) => {
      await providerAnswers(page, 'github', { code: 'e2e' });
      await page.goto('/auth/');
      await loginButton(page, 'github').click();
      await expect(page).toHaveURL(/\/home\/?$/);

      await sideMenu(page).getByText('usuario-mock', { exact: true }).click();
      await page.getByRole('menuitem', { name: 'Finalizar Sessão' }).click();

      await expect(page.getByText(FAREWELL)).toBeVisible();
      await expect(page).toHaveURL('/');
      await expect(page.getByText(UNAUTHENTICATED)).toHaveCount(0);
      await expect.poll(() => cookieValue(page, SESSION_COOKIES.token)).toBeNull();
    });
  }
);

test.describe('@TASK08.01-CA5 Com o Service fora do ar, recarregar a página não apaga a sessão', () => {
  test.use({ session: false, scenario: githubSession });

  test('a validação do token responde 503 e a pessoa continua logada depois do reload', async ({ page, baseURL }) => {
    await page.context().addCookies(
      [
        [SESSION_COOKIES.token, SERVICE_DOWN_TOKEN],
        [SESSION_COOKIES.provider, 'github'],
        [SESSION_COOKIES.loginAt, Date.now().toString()]
      ].map(([name, value]) => ({ name, value, url: baseURL as string }))
    );

    await page.goto('/home/');
    await expect(page).toHaveURL(/\/home\/?$/);
    await expect(sideMenu(page)).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/home\/?$/);
    await expect(sideMenu(page)).toBeVisible();
    expect(await cookieValue(page, SESSION_COOKIES.token)).toBe(SERVICE_DOWN_TOKEN);
  });
});

test.describe('@TASK08.01-CA6 Navegação logada funciona como antes, sem erro de hidratação nem do ECharts', () => {
  test.describe('no produto', () => {
    test.use({ scenario: { ...produto.comDados, ...overview.comDados, ...repositorio.comDados } });

    test('menu lateral, breadcrumbs, dashboards e troca de idioma, sem modal de espera e sem erro no console', async ({
      page
    }) => {
      const errors = watchHydrationErrors(page);

      await page.goto(produto.PRODUTO_PATH);
      await expect(sideMenu(page)).toBeVisible();

      await sideMenu(page).getByText('Repositórios', { exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${PRODUCT_PATH}/repositories/?$`));

      // o breadcrumb mostra o segmento da URL do produto
      await page
        .getByRole('navigation')
        .getByRole('link', { name: `${ORGANIZATION_ID}-${PRODUCT_ID}-MeasureSoftGram` })
        .click();
      await expect(page).toHaveURL(new RegExp(`${PRODUCT_PATH}/?$`));

      await sideMenu(page).getByText('Dashboards', { exact: true }).click();
      await sideMenu(page).getByText('1. Visão Geral de Qualidade', { exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${overview.OVERVIEW_PATH}?$`));
      await expect(page.getByRole('heading', { level: 1, name: '1. Visão Geral de Qualidade' })).toBeVisible();

      await page.goto(repositorio.REPOSITORY_PATH);
      await expect(page.getByRole('heading', { name: REPOSITORY_TITLE })).toBeVisible();

      await page.locator('[data-id="en-button"]').click();
      await expect(sideMenu(page).getByText('Repositories', { exact: true })).toBeVisible();
      // o reload em inglês hidrata o HTML do servidor com o idioma salvo no navegador; o fixture grava 'pt' a cada carga,
      // e este script roda depois dele
      await page.addInitScript(() => localStorage.setItem('locale_lang', 'en'));
      await page.reload();
      await expect(sideMenu(page).getByText('Repositories', { exact: true })).toBeVisible();
      await page.locator('[data-id="pt-button"]').click();
      await expect(sideMenu(page).getByText('Repositórios', { exact: true })).toBeVisible();

      // o loading de navegação substitui os modais antigos de espera e de timeout
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });

  test.describe('na troca de organização', () => {
    test.use({ provider: 'gitlab', scenario: grupoComNomeDoUsuario });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (id) => localStorage.setItem('selectedOrgId', JSON.stringify(id)),
        JOAO_PERSONAL_ORGANIZATION.id
      );
    });

    test('trocar do namespace pessoal para o grupo não gera erro de hidratação', async ({ page }) => {
      const errors = watchHydrationErrors(page);
      const groupSelect = page.getByRole('combobox', { name: /^Grupos do GitLab/ });

      await page.goto(IMPORT_PATH);
      await expect(groupSelect).toHaveText(JOAO_GROUP.name);
      await groupSelect.click();
      await page.getByRole('option', { name: `${JOAO_GROUP.name} (${JOAO_GROUP.description})` }).click();
      await expect(groupSelect).toHaveText(`${JOAO_GROUP.name} (${JOAO_GROUP.description})`);

      await page.reload();
      await expect(groupSelect).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
});

test.describe('@TASK08.01-CA7 Quem tinha sessão antes do deploy precisa entrar de novo uma vez', () => {
  test.use({ session: false });

  test('o token antigo do localStorage não vale como sessão: a rota privada vai para o login', async ({ page }) => {
    await page.addInitScript(
      (key) => localStorage.setItem(key, JSON.stringify('Token e2e-token-msg')),
      LEGACY_TOKEN_KEY
    );

    await page.goto('/home/');

    await expect(page).toHaveURL(/\/auth\/?\?returnTo=%2Fhome$/);
    await expect(loginButton(page, 'github')).toBeEnabled();
    await expect(sideMenu(page)).toBeHidden();
  });
});

test.describe('@TASK08.01 Login nos provedores reais', () => {
  // o GitHub e o GitLab de verdade pedem conta, 2FA e captcha, e os OAuth Apps só aceitam o redirect_uri da homologação
  test.skip('entrar com o GitHub e com o GitLab reais, na homologação, até a página inicial (manual)', async () => {});
});
