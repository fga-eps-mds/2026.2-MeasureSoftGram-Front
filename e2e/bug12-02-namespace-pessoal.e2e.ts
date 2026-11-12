import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import {
  IMPORT_PATH,
  JOAO_PERSONAL_ORGANIZATION,
  JOAO_PERSONAL_PRODUCT,
  JOAO_USER,
  pessoalComNomeDeGrupo,
  pessoalComNomeDeOutraOrg
} from './fixtures/importacao-gitlab';

const groupSelect = (page: Page) => page.getByRole('combobox', { name: /^Grupos do GitLab/ });
const productSelect = (page: Page) => page.getByRole('combobox', { name: /^Produtos do MeasureSoftGram/ });
const toasts = (page: Page) => page.locator('.Toastify__toast-body');

/**
 * Os POSTs de organização que a tela faz. O defeito criava a organização pessoal pelo nome (`POST /organizations/`) e,
 * com o nome já usado, caía numa busca pelo nome que achava a organização errada (ou nenhuma).
 */
function organizationPosts(page: Page): string[] {
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/v1/organizations/')) posts.push(new URL(r.url()).pathname);
  });
  return posts;
}

/** O namespace pessoal entra na tela pela organização devolvida pelo import-gitlab-user (a 3), com o produto dela. */
async function expectPersonalOrganization(page: Page, posts: string[]) {
  await expect(groupSelect(page)).toHaveText(JOAO_USER.name);
  await expect(productSelect(page)).toHaveText(JOAO_PERSONAL_PRODUCT.name);
  // só o import-gitlab-user; na primeira entrada a tela às vezes o chama duas vezes (idempotente no Service)
  expect(posts.length).toBeGreaterThan(0);
  expect(new Set(posts)).toEqual(new Set(['/api/v1/organizations/import-gitlab-user/']));
  await expect(toasts(page)).toHaveCount(0);
}

test.describe('@BUG12.02-CA1 Nome do usuário já usado por um grupo: o namespace pessoal mostra os produtos da organização pessoal', () => {
  test.use({ provider: 'gitlab', scenario: pessoalComNomeDeGrupo });

  test.beforeEach(async ({ page }) => {
    // a organização atual é a 1, a do grupo joao
    await page.addInitScript(() => localStorage.setItem('selectedOrgId', JSON.stringify('1')));
  });

  test('escolher o namespace pessoal joao importa a organização pessoal, e não usa a do grupo joao', async ({
    page
  }) => {
    await page.goto(IMPORT_PATH);
    await expect(page.getByRole('heading', { name: 'Importação de Projetos' })).toBeVisible();
    await expect(productSelect(page)).toHaveText('MeasureSoftGram');

    const posts = organizationPosts(page);
    const personalProducts = page.waitForRequest(
      (r) => new URL(r.url()).pathname === `/api/v1/organizations/${JOAO_PERSONAL_ORGANIZATION.id}/products/`
    );
    await groupSelect(page).click();
    await page.getByRole('option', { name: JOAO_USER.name, exact: true }).click();
    await personalProducts;

    await expectPersonalOrganization(page, posts);
  });
});

test.describe('@BUG12.02-CA2 Nome já usado por organização de outra pessoa: a importação conclui sem erro', () => {
  test.use({ provider: 'gitlab', scenario: pessoalComNomeDeOutraOrg });

  test('o namespace pessoal joao vira a organização pessoal, sem erro e sem a organização da outra pessoa', async ({
    page
  }) => {
    const posts = organizationPosts(page);
    const others: string[] = [];
    // a organização joao da outra pessoa não está na lista do usuário; a tela não pode chegar até ela por nenhum id
    page.on('request', (r) => {
      const match = new URL(r.url()).pathname.match(/^\/api\/v1\/organizations\/(\d+)\//);
      if (match && !['1', JOAO_PERSONAL_ORGANIZATION.id].includes(match[1])) others.push(r.url());
    });

    await page.goto(IMPORT_PATH);
    await expect(page.getByRole('heading', { name: 'Importação de Projetos' })).toBeVisible();

    await expectPersonalOrganization(page, posts);
    expect(others).toEqual([]);
  });
});
