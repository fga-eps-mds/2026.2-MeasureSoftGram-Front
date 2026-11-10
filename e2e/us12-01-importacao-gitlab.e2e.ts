import { Locator, Page, Request } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ORGANIZATION_ID, PRODUCT_ID, PRODUCT_PATH } from './fixtures/common';
import {
  comProjetos,
  comSubgrupo,
  erro500,
  github,
  GROUP,
  IMPORT_API,
  IMPORT_PATH,
  jaImportado,
  ORGANIZATION_OF,
  PARSER,
  PARSER_REPOSITORY,
  PERSONAL,
  SUBGROUP,
  token409,
  token409Grupos,
  WITH_PARSER
} from './fixtures/importacao-gitlab';
import projects from './fixtures/importacao-gitlab/gitlab-projects.json';
import squadProjects from './fixtures/importacao-gitlab/gitlab-projects-squad-01.json';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // sem idioma salvo o app abre em inglês; os critérios estão em português
    localStorage.setItem('locale_lang', 'pt');
    // quem já usou o app tem a organização salva; sem ela, a tela escolhe o primeiro namespace (a conta pessoal) se os
    // namespaces chegam antes das organizações (Products.tsx:162-174) e só depois troca para o grupo
    localStorage.setItem('selectedOrgId', JSON.stringify('1'));
  });
});

const IMPORTED = 'Projeto parser importado com sucesso!';

/** Os avisos do react-toastify (o anunciador de rotas do Next também tem role alert). */
const toasts = (page: Page) => page.locator('.Toastify__toast-body');

/** O FaGitlab do react-icons não tem nome acessível: o desenho (path) identifica o ícone. */
const gitlabIcon = (scope: Page | Locator) => scope.locator('svg:has(path[d^="M105.2 24.9"])');

const groupSelect = (page: Page) => page.getByRole('combobox', { name: /^Grupos do GitLab/ });
const productSelect = (page: Page) => page.getByRole('combobox', { name: /^Produtos do MeasureSoftGram/ });

/** Os itens da lista da importação (o List do MUI), com o caminho do projeto num h6; o breadcrumb também é uma lista. */
const items = (page: Page) => page.locator('ul.MuiList-root > li');
const projectNames = (page: Page) => items(page).getByRole('heading', { level: 6 });
const item = (page: Page, path: string) =>
  items(page).filter({ has: page.getByRole('heading', { level: 6, name: path, exact: true }) });

const pathsOf = (list: { gitlab_path_with_namespace: string }[]) => list.map((p) => p.gitlab_path_with_namespace);
/** A primeira página do grupo: dez dos doze projetos. */
const FIRST_PAGE = pathsOf(projects.slice(0, 10));

/** O próximo pedido da lista de projetos do GitLab com estes valores na query (null: o parâmetro não vai). */
const projectsRequest = (page: Page, query: Record<string, string | null> = {}): Promise<Request> =>
  page.waitForRequest((r) => {
    const params = new URL(r.url()).searchParams;
    return (
      r.url().includes('/gitlab-projects/') && Object.entries(query).every(([key, value]) => params.get(key) === value)
    );
  });

const importRequest = (page: Page) =>
  page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith(`/api${IMPORT_API.repositories}`));

const REPOSITORIES_PATH = `${PRODUCT_PATH}/repositories/`;
/** O caminho que o lápis da lista de Projetos monta (RepositoriesTable.tsx:211). */
const EDIT_PATH = `/products/${ORGANIZATION_ID}-${PRODUCT_ID}/repositories/manage-repository?id=${PARSER_REPOSITORY.id}`;
const parserRow = (page: Page) => page.getByTestId('repository-row').filter({ hasText: PARSER.name });

/**
 * Abre a edição do parser pela navegação do Next, como o lápis faria: o lápis leva à tela do projeto (fixme no CA6) e a
 * URL direta volta para /home antes de a organização carregar (RepositoryForm.tsx:71-74).
 */
async function openEdit(page: Page) {
  await page.goto(REPOSITORIES_PATH);
  await expect(parserRow(page)).toBeVisible();
  await page.evaluate((path) => (window as any).next.router.push(path), EDIT_PATH);
  await expect(page.getByText('Editar Projeto', { exact: true })).toBeVisible();
}

/** Abre a importação e espera o grupo e o produto selecionados. */
async function openImport(page: Page) {
  await page.goto(IMPORT_PATH);
  await expect(page.getByRole('heading', { name: 'Importação de Projetos' })).toBeVisible();
  await expect(groupSelect(page)).toHaveText(`${GROUP.name} (${GROUP.description})`);
  await expect(productSelect(page)).toHaveText('MeasureSoftGram');
}

test.describe('@US12.01-CA1 Termos e ícone do provedor nas telas de Repositórios, Importação e Edição', () => {
  test.describe('conta do GitLab', () => {
    test.use({ provider: 'gitlab' });

    test.describe('importação', () => {
      test.use({ scenario: comProjetos });

      test('fala em Projetos e Grupos, com o ícone e o link de permissões do GitLab', async ({ page }) => {
        await openImport(page);
        await expect(
          page.getByText('Selecione seu grupo e o produto correspondente para gerenciar seus projetos.')
        ).toBeVisible();
        await expect(gitlabIcon(page)).toHaveAttribute('color', '#fc6d26');
        await expect(page.getByTestId('GitHubIcon')).toHaveCount(0);
        await expect(page.getByPlaceholder('Buscar projetos do produto...')).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Conceder acesso ou gerenciar permissões no GitLab' })
        ).toHaveAttribute('href', 'https://gitlab.com/-/profile/applications');
        // "apenas projetos do GitLab" vem do Service; aqui, as rotas do GitHub não têm handler e o teste falharia
        await expect(projectNames(page)).toHaveText(FIRST_PAGE);
      });
    });

    test.describe('lista e edição', () => {
      test.use({ scenario: jaImportado });

      test('a lista de Projetos e a edição falam em Projeto e mostram o ícone do GitLab', async ({ page }) => {
        await page.goto(REPOSITORIES_PATH);
        await expect(page.getByRole('heading', { level: 4, name: 'Projetos' })).toBeVisible();
        await expect(gitlabIcon(parserRow(page))).toBeVisible();

        await openEdit(page);
        await expect(page.getByLabel('Nome do Projeto')).toHaveValue(PARSER.name);
        await expect(page.getByLabel('URL do Projeto')).toHaveValue(PARSER.url);
        const platform = page.getByTestId('repo-platform-input');
        await expect(platform.getByRole('combobox')).toHaveText('GitLab');
        await expect(gitlabIcon(platform)).toBeVisible();
      });
    });
  });

  test.describe('conta do GitHub', () => {
    test.use({ provider: 'github', scenario: github });

    test('o fluxo atual continua: Repositórios, Organizações, ícone e repositórios do GitHub', async ({ page }) => {
      await page.goto(IMPORT_PATH);
      await expect(page.getByRole('heading', { name: 'Importação de Repositórios' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: /^Organizações do GitHub/ })).toHaveText(
        'fga-eps-mds (Organização da disciplina)'
      );
      await expect(page.getByTestId('GitHubIcon')).toBeVisible();
      await expect(gitlabIcon(page)).toHaveCount(0);
      // o produto já tem o repositório do common: a tela abre em "Importados"
      await expect(projectNames(page)).toHaveText(['fga-eps-mds/2026.1-MeasureSoftGram-Front']);

      const repos = page.waitForRequest((r) => r.url().includes('/github-repos/'));
      await page.getByRole('tab', { name: 'A Importar' }).click();
      await repos;
      await expect(projectNames(page)).toHaveText(['fga-eps-mds/2026.1-MeasureSoftGram-Service']);
    });
  });
});

test.describe('@US12.01-CA2 Seletor de grupos e projetos do grupo escolhido, com paginação', () => {
  test.use({ provider: 'gitlab', scenario: comProjetos });

  test('o seletor "Grupos do GitLab" lista a conta pessoal, o grupo e o subgrupo', async ({ page }) => {
    await openImport(page);
    await groupSelect(page).click();
    await expect(page.getByRole('option')).toHaveText([
      PERSONAL.name,
      `${GROUP.name} (${GROUP.description})`,
      `${SUBGROUP.name} (${SUBGROUP.description})`
    ]);
  });

  test('"A Importar" mostra os projetos do grupo, dez por página, e busca a página 2', async ({ page }) => {
    const first = projectsRequest(page);
    await openImport(page);
    await expect(page.getByRole('tab', { name: 'A Importar' })).toHaveAttribute('aria-selected', 'true');
    const params = new URL((await first).url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({
      namespace_id: String(GROUP.id),
      kind: 'group',
      page: '1',
      exclude_product: '1'
    });
    await expect(projectNames(page)).toHaveText(FIRST_PAGE);

    const second = projectsRequest(page, { page: '2' });
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await second;
    await expect(projectNames(page)).toHaveText(pathsOf(projects.slice(10)));
    await expect(page.getByRole('button', { name: 'Go to page 3' })).toHaveCount(0);
  });

  test.describe('outro grupo', () => {
    test.use({ scenario: comSubgrupo });

    test('ao escolher o subgrupo, importa o grupo e lista os projetos dele', async ({ page }) => {
      // o mock casa só pelo caminho: aqui a organização depende do grupo do corpo do POST
      await page.route('**/api/v1/organizations/import-gitlab/', (route) =>
        route.fulfill({ json: ORGANIZATION_OF[route.request().postDataJSON().gitlab_group_id] })
      );
      await openImport(page);
      await expect(projectNames(page)).toHaveText(FIRST_PAGE);

      const importGroup = page.waitForRequest((r) => r.url().endsWith('/import-gitlab/'));
      // a troca pede antes a lista com a organização e o produto anteriores; a final é a do produto do subgrupo
      const subgroupProjects = projectsRequest(page, { exclude_product: '2' });
      await groupSelect(page).click();
      await page.getByRole('option', { name: SUBGROUP.name }).click();
      expect((await importGroup).postDataJSON()).toEqual({ gitlab_group_id: SUBGROUP.id });
      const url = new URL((await subgroupProjects).url());
      // a organização é a que o POST devolveu para o subgrupo
      expect(url.pathname).toBe(`/api${IMPORT_API.squadProjects}`);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        namespace_id: String(SUBGROUP.id),
        kind: 'group',
        page: '1',
        exclude_product: '2'
      });
      await expect(groupSelect(page)).toHaveText(`${SUBGROUP.name} (${SUBGROUP.description})`);
      await expect(projectNames(page)).toHaveText(pathsOf(squadProjects));
    });
  });
});

test.describe('@US12.01-CA3 Busca pelo nome do projeto', () => {
  test.use({ provider: 'gitlab', scenario: comProjetos });

  test('a busca pede ao Service os projetos com o nome e mostra só eles', async ({ page }) => {
    await openImport(page);
    await expect(projectNames(page)).toHaveCount(10);
    const search = projectsRequest(page, { search: 'parser' });
    await page.getByPlaceholder('Buscar projetos do produto...').fill('parser');
    await search;
    await expect(projectNames(page)).toHaveText([PARSER.gitlab_path_with_namespace]);
  });

  test('sem resultado, diz que nenhum projeto foi encontrado', async ({ page }) => {
    await openImport(page);
    await expect(projectNames(page)).toHaveCount(10);
    const search = projectsRequest(page, { search: 'inexistente' });
    await page.getByPlaceholder('Buscar projetos do produto...').fill('inexistente');
    await search;
    await expect(page.getByText('Nenhum projeto associado a este produto foi encontrado.')).toBeVisible();
    await expect(projectNames(page)).toHaveCount(0);
  });
});

test.describe('@US12.01-CA4 "Importar" vincula o projeto ao produto selecionado', () => {
  test.use({ provider: 'gitlab', scenario: comProjetos });

  test('o projeto vai para o produto escolhido e o aviso de sucesso aparece', async ({ page }) => {
    await openImport(page);
    const parser = item(page, PARSER.gitlab_path_with_namespace);
    const post = importRequest(page);
    await parser.getByRole('button', { name: 'Importar' }).click();
    // o caminho do POST é o do produto selecionado (organização 1, produto 1)
    await post;
    await expect(toasts(page)).toHaveText([IMPORTED]);
    await expect(parser.getByText('Importado', { exact: true })).toBeVisible();
    await expect(parser.getByRole('button', { name: 'Importar' })).toHaveCount(0);
  });
});

test.describe('@US12.01-CA5 Projeto já vinculado com o selo "Importado", sem importar de novo', () => {
  test.use({ provider: 'gitlab', scenario: jaImportado });

  test('em "Importados" e em "Todos", o parser tem o selo e nenhum botão "Importar"', async ({ page }) => {
    await openImport(page);
    // com projetos no produto, a tela abre em "Importados"
    await expect(page.getByRole('tab', { name: 'Importados' })).toHaveAttribute('aria-selected', 'true');
    await expect(projectNames(page)).toHaveText([PARSER.gitlab_path_with_namespace]);
    await expect(item(page, PARSER.gitlab_path_with_namespace).getByText('Importado', { exact: true })).toBeVisible();

    const all = projectsRequest(page, { exclude_product: null });
    await page.getByRole('tab', { name: 'Todos' }).click();
    await all;
    await expect(projectNames(page)).toHaveText(FIRST_PAGE);
    const parser = item(page, PARSER.gitlab_path_with_namespace);
    await expect(parser.getByText('Importado', { exact: true })).toBeVisible();
    await expect(parser.getByRole('button', { name: 'Importar' })).toHaveCount(0);
    await expect(item(page, 'fga-eps-mds/front').getByRole('button', { name: 'Importar' })).toBeEnabled();
  });
});

test.describe('@US12.01-CA6 Projeto salvo com plataforma, imported, URL e id; na lista; edição bloqueada', () => {
  test.use({ provider: 'gitlab' });

  test.describe('importação', () => {
    test.use({ scenario: comProjetos });

    test('o POST leva platform gitlab, imported e a URL, e o projeto aparece na lista de Projetos', async ({
      page,
      api
    }) => {
      await openImport(page);
      const post = importRequest(page);
      await item(page, PARSER.gitlab_path_with_namespace).getByRole('button', { name: 'Importar' }).click();
      expect((await post).postDataJSON()).toEqual({
        name: PARSER.name,
        url: PARSER.url,
        description: PARSER.description,
        platform: 'gitlab',
        imported: true
      });
      await expect(toasts(page)).toHaveText([IMPORTED]);

      // o Service passa a listar o projeto no produto
      api.set(IMPORT_API.repositories, WITH_PARSER);
      api.set(`${IMPORT_API.repository}latest-values/tsqmi/badge`, null);
      await page.goto(REPOSITORIES_PATH);
      await expect(page.getByTestId('repo-name')).toHaveText([PARSER.name]);
    });

    test.fixme(
      'o POST leva o identificador do projeto no GitLab (bug: o Front manda só nome, URL, descrição, plataforma e imported; Products.tsx:339-345)',
      async ({ page }) => {
        await openImport(page);
        const post = importRequest(page);
        await item(page, PARSER.gitlab_path_with_namespace).getByRole('button', { name: 'Importar' }).click();
        expect((await post).postDataJSON()).toMatchObject({ gitlab_project_id: PARSER.gitlab_project_id });
      }
    );
  });

  test.describe('edição', () => {
    test.use({ scenario: jaImportado });

    test('nome, URL e plataforma do projeto importado ficam bloqueados', async ({ page }) => {
      await openEdit(page);
      await expect(page.getByLabel('Nome do Projeto')).toHaveValue(PARSER_REPOSITORY.name);
      await expect(page.getByLabel('Nome do Projeto')).toBeDisabled();
      await expect(page.getByLabel('URL do Projeto')).toHaveValue(PARSER_REPOSITORY.url);
      await expect(page.getByLabel('URL do Projeto')).toBeDisabled();
      const platform = page.getByTestId('repo-platform-input').getByRole('combobox');
      await expect(platform).toHaveText('GitLab');
      await expect(platform).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
    });

    test.fixme(
      'o lápis da lista de Projetos abre a edição (bug: o clique no lápis também chega à linha, que leva à tela do projeto; RepositoriesTable.tsx:180 e 208-214)',
      async ({ page }) => {
        await page.goto(REPOSITORIES_PATH);
        await parserRow(page).getByRole('button', { name: 'edit' }).click();
        await expect(page).toHaveURL(/\/repositories\/manage-repository\/?\?id=1$/);
        await expect(page.getByText('Editar Projeto', { exact: true })).toBeVisible();
      }
    );
  });
});

test.describe('@US12.01-CA7 Falha na API do GitLab e token expirado, sem detalhes técnicos', () => {
  test.use({ provider: 'gitlab' });

  test.describe('falha ao listar os projetos', () => {
    test.use({ scenario: erro500 });

    test('mostra "Não foi possível carregar os projetos" e "Tentar Novamente" carrega a lista', async ({
      page,
      api
    }) => {
      await openImport(page);
      const failure = page.getByRole('heading', { name: 'Não foi possível carregar os projetos' });
      await expect(failure).toBeVisible();
      await expect(toasts(page)).toHaveText(['Erro ao buscar projetos do GitLab.']);
      await expect(failure.locator('..')).not.toContainText(/500|Erro interno|Request failed/);

      api.set(IMPORT_API.projects, comProjetos[IMPORT_API.projects]);
      await page.getByRole('button', { name: 'Tentar Novamente' }).click();
      await expect(projectNames(page)).toHaveText(FIRST_PAGE);
    });
  });

  test.describe('token expirado ao listar os projetos', () => {
    test.use({ scenario: token409 });

    test('mostra "Token do GitLab expirado ou inválido" e "Autorizar GitLab" leva ao OAuth do GitLab', async ({
      page
    }) => {
      await page.route('https://gitlab.com/**', (route) => route.fulfill({ status: 200, body: 'gitlab' }));
      await openImport(page);
      const title = page.getByRole('heading', { name: 'Token do GitLab expirado ou inválido' });
      await expect(title).toBeVisible();
      await expect(title.locator('..')).not.toContainText(/409|gitlab_token_invalid|Request failed/);
      await expect(toasts(page)).toHaveText(['Token do GitLab expirado ou inválido.']);
      await page.getByRole('button', { name: 'Autorizar GitLab' }).click();
      await expect(page).toHaveURL(/^https:\/\/gitlab\.com\/oauth\/authorize\?/);
    });
  });

  test.describe('token expirado ao listar os grupos', () => {
    test.use({ scenario: token409Grupos });

    test('mostra o mesmo aviso, com "Autorizar GitLab", no lugar da lista', async ({ page }) => {
      await page.route('https://gitlab.com/**', (route) => route.fulfill({ status: 200, body: 'gitlab' }));
      await page.goto(IMPORT_PATH);
      const title = page.getByRole('heading', { name: 'Token do GitLab expirado ou inválido' });
      await expect(title).toBeVisible();
      await expect(title.locator('..')).not.toContainText(/409|gitlab_token_invalid|Request failed/);
      await expect(toasts(page)).toHaveText(['Token do GitLab expirado ou inválido.']);
      await page.getByRole('button', { name: 'Autorizar GitLab' }).click();
      await expect(page).toHaveURL(/^https:\/\/gitlab\.com\/oauth\/authorize\?/);
    });
  });
});
