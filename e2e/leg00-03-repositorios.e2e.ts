import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import {
  editaRepositorio,
  IMPORTED,
  MANUAL,
  REPOSITORIES_PATH,
  REPOSITORY_FORM_PATH,
  repositorioNomeRepetido,
  repositorioUrlInvalida
} from './fixtures/legados';

/**
 * Fluxo legado de edição e cadastro de repositórios (manage-repository, pelo lápis da lista de repositórios). Sem US de
 * origem: os critérios descrevem o comportamento atual e estão na issue LEG00.03 do DOC. A exclusão é o BUG09.01.
 */
const NAME = 'Nome do Repositório';
const DESCRIPTION = 'Descrição';
const URL_FIELD = 'URL do Repositório';
const SAVE = 'Salvar Alterações';

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

async function openEdit(page: Page, repo: { id: number; name: string }) {
  await page.goto(REPOSITORIES_PATH);
  await row(page, repo.name).getByRole('button', { name: 'edit' }).click();
  await expect(page).toHaveURL(new RegExp(`manage-repository/?\\?id=${repo.id}$`));
  await expect(page.getByLabel(NAME)).toHaveValue(repo.name);
}

const saveRequest = (page: Page, method: string, path: string) =>
  page.waitForRequest((request) => request.method() === method && new URL(request.url()).pathname.endsWith(path));

test.describe('@LEG00.03-CA1 O lápis da lista abre a edição com os dados do repositório', () => {
  test.use({ scenario: editaRepositorio });

  test('nome, descrição, URL e plataforma vêm preenchidos', async ({ page }) => {
    await openEdit(page, MANUAL);
    await expect(page.getByLabel(DESCRIPTION)).toHaveValue(MANUAL.description);
    await expect(page.getByLabel(URL_FIELD)).toHaveValue(MANUAL.url);
    await expect(page.getByTestId('repo-platform-input')).toContainText('GitHub');
  });
});

test.describe('@LEG00.03-CA2 Salvar a edição grava e volta à lista', () => {
  test.use({ scenario: editaRepositorio });

  test('envia os dados alterados, avisa o sucesso e volta à lista de repositórios', async ({ page }) => {
    await openEdit(page, MANUAL);
    await page.getByLabel(DESCRIPTION).fill('Descrição nova');
    const request = saveRequest(page, 'PUT', `/repositories/${MANUAL.id}/`);
    await page.getByRole('button', { name: SAVE }).click();
    expect((await request).postDataJSON()).toMatchObject({
      name: MANUAL.name,
      description: 'Descrição nova',
      url: MANUAL.url
    });
    await expect(page.getByText('Repositório atualizado com sucesso!')).toBeVisible();
    await expect(page).toHaveURL(/\/repositories\/?$/);
  });
});

test.describe('@LEG00.03-CA3 Repositório importado do provedor não tem os dados editáveis', () => {
  test.use({ scenario: editaRepositorio });

  test('nome, descrição, URL e plataforma ficam bloqueados', async ({ page }) => {
    await openEdit(page, IMPORTED);
    for (const label of [NAME, DESCRIPTION, URL_FIELD]) await expect(page.getByLabel(label)).toBeDisabled();
    await expect(page.getByTestId('repo-platform-input').getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});

test.describe('@LEG00.03-CA4 Falha ao salvar: a mensagem diz o motivo', () => {
  test.describe('nome repetido', () => {
    test.use({ scenario: repositorioNomeRepetido });

    test('avisa que já existe um repositório com o nome e fica na edição', async ({ page }) => {
      await openEdit(page, MANUAL);
      await page.getByRole('button', { name: SAVE }).click();
      await expect(page.getByText('Já existe um repositório com este nome.')).toBeVisible();
      await expect(page).toHaveURL(/manage-repository/);
    });
  });

  test.describe('URL sem http(s)', () => {
    test.use({ scenario: repositorioUrlInvalida });

    test('avisa que a URL deve começar com http ou https', async ({ page }) => {
      await openEdit(page, MANUAL);
      await page.getByLabel(URL_FIELD).fill('github.com/exemplo/msg-manual');
      await page.getByRole('button', { name: SAVE }).click();
      await expect(page.getByText('A URL deve começar com http ou https.')).toBeVisible();
    });
  });
});

test.describe('@LEG00.03-CA5 Cadastrar repositório à mão', () => {
  test.use({ scenario: editaRepositorio });

  test('envia os dados, avisa o sucesso e volta à lista', async ({ page }) => {
    await page.goto(REPOSITORY_FORM_PATH);
    await page.getByLabel(NAME).fill('msg-novo');
    await page.getByLabel(URL_FIELD).fill('https://github.com/exemplo/msg-novo');
    await page.getByTestId('repo-platform-input').getByRole('combobox').click();
    await page.getByRole('option', { name: 'GitHub' }).click();
    const request = saveRequest(page, 'POST', '/repositories/');
    await page.getByRole('button', { name: 'Criar Repositório' }).click();
    expect((await request).postDataJSON()).toMatchObject({ name: 'msg-novo', platform: 'github', imported: false });
    await expect(page.getByText('Repositório criado com sucesso')).toBeVisible();
    await expect(page).toHaveURL(/\/repositories\/?$/);
  });

  // a lista só tem a importação; nenhuma tela leva ao cadastro à mão, que abre só pela URL
  test.skip('chegar ao cadastro por um botão da interface (manual: não existe)', async () => {});
});
