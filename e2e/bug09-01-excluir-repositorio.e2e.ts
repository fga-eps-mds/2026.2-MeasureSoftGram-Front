import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ApiHandlers } from './support/api';
import { page as paginated, PRODUCT_API, PRODUCT_PATH } from './fixtures/common';

/**
 * BUG09.01 (#107, da triagem do bug Front#36 de 2026.1): o repositório excluído continuava na lista até recarregar a
 * página quando era o último do produto. CA1 é o comportamento esperado da issue; CA2, o caso original do Front#36
 * (um de vários repositórios), com a confirmação pelo nome.
 */
const REPOSITORIES_PATH = `${PRODUCT_PATH}/repositories/`;
const REPOSITORIES_API = `${PRODUCT_API}/repositories/`;
const CONFIRM = 'CONFIRMAR EXCLUSÃO';
const DELETED = 'Repositório excluído com sucesso!';

const repo = (id: number, name: string) => ({
  id,
  name,
  description: null,
  url: `https://github.com/exemplo/${name}`,
  platform: 'github',
  imported: true,
  latest_values: {}
});
const FRONT = repo(1, 'msg-front');
const SERVICE = repo(2, 'msg-service');

/** O produto com estes repositórios; o DELETE do msg-front tira ele da lista que o Service devolve depois. */
function produtoCom(repositories: ReturnType<typeof repo>[]): ApiHandlers {
  let deleted = false;
  return {
    [REPOSITORIES_API]: () => paginated(repositories.filter((item) => !deleted || item.id !== FRONT.id)),
    [`${REPOSITORIES_API}${FRONT.id}/`]: (_url: URL, method: string) => {
      if (method !== 'DELETE') return undefined;
      deleted = true;
      return { status: 204 };
    }
  };
}

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

async function openDeleteModal(page: Page) {
  await page.goto(REPOSITORIES_PATH);
  await expect(row(page, FRONT.name)).toBeVisible();
  await row(page, FRONT.name).getByRole('button', { name: 'delete' }).click();
  await expect(page.getByRole('button', { name: CONFIRM })).toBeVisible();
}

async function confirmDelete(page: Page) {
  await page.getByRole('textbox').fill(FRONT.name);
  await page.getByRole('button', { name: CONFIRM }).click();
  await expect(page.getByText(DELETED)).toBeVisible();
}

test.describe('@BUG09.01-CA1 Excluir o único repositório do produto deixa a lista vazia', () => {
  // um estado por teste: o --repeat-each não pode herdar a exclusão do teste anterior
  test.use({ scenario: async ({}, provide) => provide(produtoCom([FRONT])) });

  test('o repositório sai da tabela sem recarregar a página', async ({ page }) => {
    await openDeleteModal(page);
    await confirmDelete(page);
    await expect(row(page, FRONT.name)).toHaveCount(0);
  });
});

test.describe('@BUG09.01-CA2 Excluir um de vários repositórios atualiza a lista na hora', () => {
  test.use({ scenario: async ({}, provide) => provide(produtoCom([FRONT, SERVICE])) });

  test('a exclusão só é confirmada com o nome do repositório digitado', async ({ page }) => {
    await openDeleteModal(page);
    const input = page.getByRole('textbox');
    const confirm = page.getByRole('button', { name: CONFIRM });
    await expect(confirm).toBeDisabled();
    await input.fill('msg-fron');
    await expect(page.getByText(`O nome '${FRONT.name}' está incorreto.`)).toBeVisible();
    await expect(confirm).toBeDisabled();
    await input.fill(FRONT.name);
    await expect(confirm).toBeEnabled();
  });

  test('só o repositório excluído sai da tabela, sem recarregar a página', async ({ page }) => {
    await openDeleteModal(page);
    await confirmDelete(page);
    await expect(row(page, FRONT.name)).toHaveCount(0);
    await expect(row(page, SERVICE.name)).toBeVisible();
  });
});
