import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ORGANIZATION_ID } from './fixtures/common';
import {
  criaOrganizacao,
  editaOrganizacao,
  ORGANIZATIONS_PATH,
  organizacaoErro500,
  organizacaoNomeRepetido
} from './fixtures/legados';

/**
 * Fluxo legado de organizações (/organizations, que a página Sobre liga em "Criar organização"). Sem US de origem: os
 * critérios descrevem o comportamento atual e estão na issue LEG00.01 do DOC.
 */
const NAME = 'Nome da organização';
const DESCRIPTION = 'Descrição da organização';

async function openForm(page: Page, path = ORGANIZATIONS_PATH) {
  await page.goto(path);
  await expect(page.getByTestId('organization-title')).toBeVisible();
}

async function fillForm(page: Page) {
  await page.getByLabel(NAME).fill('Squad Qualidade');
  await page.getByLabel(DESCRIPTION).fill('Time que cuida da qualidade');
}

const saveRequest = (page: Page, method: string, path: string) =>
  page.waitForRequest((request) => request.method() === method && new URL(request.url()).pathname.endsWith(path));

test.describe('@LEG00.01-CA1 Criar organização com nome, descrição e membros', () => {
  test.use({ scenario: criaOrganizacao });

  test('envia os dados e os membros escolhidos, avisa o sucesso e vai para a Home', async ({ page }) => {
    await openForm(page);
    await expect(page.getByTestId('organization-title')).toHaveText('ADICIONAR ORGANIZAÇÃO');
    await fillForm(page);

    await page.getByRole('button', { name: 'ADICIONAR MEMBROS' }).click();
    const maria = page.getByRole('listitem').filter({ hasText: '(maria)' });
    await maria.getByRole('button', { name: 'Adicionar' }).click();
    await expect(maria.getByRole('button', { name: 'Adicionado' })).toBeVisible();
    await page.keyboard.press('Escape');

    const request = saveRequest(page, 'POST', '/v1/organizations/');
    await page.getByRole('button', { name: 'CRIAR' }).click();
    expect((await request).postDataJSON()).toMatchObject({
      name: 'Squad Qualidade',
      description: 'Time que cuida da qualidade',
      members: ['maria']
    });
    await expect(page.getByText('Organização criada com sucesso')).toBeVisible();
    await expect(page).toHaveURL(/\/home\/?$/, { timeout: 10_000 });
  });

  test('o nome é obrigatório', async ({ page }) => {
    await openForm(page);
    await page.getByRole('button', { name: 'CRIAR' }).click();
    await expect(page.getByLabel(NAME)).toHaveJSProperty('validity.valueMissing', true);
    await expect(page).toHaveURL(/\/organizations\/?$/);
  });
});

test.describe('@LEG00.01-CA2 Falha ao criar: mensagem e o usuário continua no formulário', () => {
  test.describe('nome repetido', () => {
    test.use({ scenario: organizacaoNomeRepetido });

    test('avisa que já existe uma organização com o nome', async ({ page }) => {
      await openForm(page);
      await fillForm(page);
      await page.getByRole('button', { name: 'CRIAR' }).click();
      await expect(page.getByText('Já existe uma organização com este nome.')).toBeVisible();
      await expect(page).toHaveURL(/\/organizations\/?$/);
    });
  });

  test.describe('erro do Service', () => {
    test.use({ scenario: organizacaoErro500 });

    test('avisa o erro sem detalhe técnico', async ({ page }) => {
      await openForm(page);
      await fillForm(page);
      await page.getByRole('button', { name: 'CRIAR' }).click();
      await expect(page.getByText('Erro ao criar a organização')).toBeVisible();
      await expect(page.getByText(/500|Erro interno/)).toHaveCount(0);
      await expect(page.getByLabel(NAME)).toHaveValue('Squad Qualidade');
    });
  });
});

test.describe('@LEG00.01-CA3 Editar organização', () => {
  test.use({ scenario: editaOrganizacao });

  test('o formulário vem preenchido e salvar grava a alteração', async ({ page }) => {
    await openForm(page, `${ORGANIZATIONS_PATH}?edit=${ORGANIZATION_ID}`);
    await expect(page.getByTestId('organization-title')).toHaveText('EDITAR ORGANIZAÇÃO');
    await expect(page.getByLabel(NAME)).toHaveValue('FGA EPS MDS');
    await expect(page.getByLabel(DESCRIPTION)).toHaveValue('Organizacao de exemplo do modo mock.');

    await page.getByLabel(DESCRIPTION).fill('Nova descrição');
    const request = saveRequest(page, 'PUT', `/v1/organizations/${ORGANIZATION_ID}/`);
    await page.getByRole('button', { name: 'SALVAR' }).click();
    expect((await request).postDataJSON()).toMatchObject({ name: 'FGA EPS MDS', description: 'Nova descrição' });
    await expect(page.getByText('Organização atualizada com sucesso!')).toBeVisible();
  });

  // nenhuma tela leva à edição: só a URL com ?edit=<id> abre o formulário preenchido
  test.skip('chegar à edição por um botão da interface (manual: não existe)', async () => {});
});
