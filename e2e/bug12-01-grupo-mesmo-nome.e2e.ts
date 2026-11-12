import { Page, Request } from '@playwright/test';
import { expect, test } from './support/fixtures';
import {
  grupoComNomeDoUsuario,
  IMPORT_API,
  IMPORT_PATH,
  JOAO_GROUP,
  JOAO_PERSONAL_ORGANIZATION
} from './fixtures/importacao-gitlab';
import projects from './fixtures/importacao-gitlab/gitlab-projects.json';

const groupSelect = (page: Page) => page.getByRole('combobox', { name: /^Grupos do GitLab/ });
const productSelect = (page: Page) => page.getByRole('combobox', { name: /^Produtos do MeasureSoftGram/ });
const projectNames = (page: Page) => page.locator('ul.MuiList-root > li').getByRole('heading', { level: 6 });
const FIRST_PAGE = projects.slice(0, 10).map((project) => project.gitlab_path_with_namespace);

/** O seletor mostra o nome e, só no grupo, a descrição entre parênteses. */
const GROUP_LABEL = `${JOAO_GROUP.name} (${JOAO_GROUP.description})`;

/** O próximo pedido da lista de projetos do GitLab para o grupo joao. */
const groupProjectsRequest = (page: Page): Promise<Request> =>
  page.waitForRequest((r) => {
    const url = new URL(r.url());
    return (
      url.pathname === `/api${IMPORT_API.projects}` &&
      url.searchParams.get('namespace_id') === String(JOAO_GROUP.id) &&
      url.searchParams.get('kind') === 'group'
    );
  });

/** Guarda os POSTs que importam o namespace pessoal: o defeito reimportava o pessoal depois de escolher o grupo. */
function personalImports(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/import-gitlab-user/')) calls.push(r.url());
  });
  return calls;
}

test.describe('@BUG12.01-CA1 Grupo e usuário com o mesmo nome: o grupo escolhido continua selecionado', () => {
  test.use({ provider: 'gitlab', scenario: grupoComNomeDoUsuario });

  test.beforeEach(async ({ page }) => {
    // começa na organização do namespace pessoal joao
    await page.addInitScript(
      (id) => localStorage.setItem('selectedOrgId', JSON.stringify(id)),
      JOAO_PERSONAL_ORGANIZATION.id
    );
  });

  test('escolher o grupo joao mantém o grupo no seletor e lista os projetos dele', async ({ page }) => {
    await page.goto(IMPORT_PATH);
    await expect(page.getByRole('heading', { name: 'Importação de Projetos' })).toBeVisible();
    await expect(groupSelect(page)).toHaveText(JOAO_GROUP.name);

    const importGroup = page.waitForRequest((r) => r.url().endsWith('/import-gitlab/'));
    const groupProjects = groupProjectsRequest(page);
    await groupSelect(page).click();
    await page.getByRole('option', { name: GROUP_LABEL }).click();
    expect((await importGroup).postDataJSON()).toEqual({ gitlab_group_id: JOAO_GROUP.id });
    // a partir daqui a organização atual é a do grupo; o defeito voltava para o pessoal e reimportava
    const reimports = personalImports(page);
    await groupProjects;

    await expect(groupSelect(page)).toHaveText(GROUP_LABEL);
    await expect(productSelect(page)).toHaveText('MeasureSoftGram');
    await expect(projectNames(page)).toHaveText(FIRST_PAGE);
    await expect(groupSelect(page)).toHaveText(GROUP_LABEL);
    expect(reimports).toEqual([]);
  });
});

test.describe('@BUG12.01-CA2 A organização atual de um grupo abre a importação com esse grupo, casado pelo id', () => {
  test.use({ provider: 'gitlab', scenario: grupoComNomeDoUsuario });

  test.beforeEach(async ({ page }) => {
    // a organização 1 é a do grupo joao (gitlab_group_id), com o mesmo nome do namespace pessoal
    await page.addInitScript(() => localStorage.setItem('selectedOrgId', JSON.stringify('1')));
  });

  test('o seletor mostra o grupo joao, e não o namespace pessoal joao', async ({ page }) => {
    const reimports = personalImports(page);
    const groupProjects = groupProjectsRequest(page);
    await page.goto(IMPORT_PATH);
    await expect(page.getByRole('heading', { name: 'Importação de Projetos' })).toBeVisible();
    await groupProjects;

    await expect(groupSelect(page)).toHaveText(GROUP_LABEL);
    await expect(productSelect(page)).toHaveText('MeasureSoftGram');
    await expect(projectNames(page)).toHaveText(FIRST_PAGE);
    expect(reimports).toEqual([]);
  });
});
