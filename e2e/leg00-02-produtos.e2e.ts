import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ORGANIZATION_ID, PRODUCT_ID } from './fixtures/common';
import { github } from './fixtures/importacao-gitlab';
import {
  criaProduto,
  editaProduto,
  PRODUCT_CREATE_PATH,
  PRODUCT_EDIT_PATH,
  produtoErro500,
  produtoNomeRepetido,
  PRODUCTS_PATH,
  telaDeProdutos
} from './fixtures/legados';

/**
 * Fluxo legado de produtos (/products/create, pelo "Criar Produto" da tela de produtos). Sem US de origem: os critérios
 * descrevem o comportamento atual e estão na issue LEG00.02 do DOC.
 */
const NAME = 'Nome';
const DESCRIPTION = 'Descrição';

async function openForm(page: Page, path = PRODUCT_CREATE_PATH) {
  await page.goto(path);
  await expect(page.getByLabel(NAME)).toBeVisible();
}

async function fillForm(page: Page) {
  await page.getByLabel(NAME).fill('Novo Produto');
  await page.getByLabel(DESCRIPTION).fill('Produto de teste');
}

const saveRequest = (page: Page, method: string, path: string) =>
  page.waitForRequest((request) => request.method() === method && new URL(request.url()).pathname.endsWith(path));

test.describe('@LEG00.02-CA1 "Criar Produto" leva ao formulário com a organização escolhida', () => {
  // o botão só habilita com a organização do provedor escolhida: a conta do GitHub da US12.01 já a escolhe
  test.use({ provider: 'github', scenario: github });

  test('na tela de produtos, o botão abre o cadastro já com a organização', async ({ page }) => {
    await page.goto(PRODUCTS_PATH);
    await page.getByRole('button', { name: 'Criar Produto' }).click();
    await expect(page).toHaveURL(new RegExp(`/products/create/?\\?id_organization=${ORGANIZATION_ID}$`));
    await expect(page.getByText('ADICIONAR PRODUTO')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Organizações' })).toHaveText('FGA EPS MDS');
  });
});

test.describe('@LEG00.02-CA2 Criar produto com nome e descrição', () => {
  test.use({ scenario: criaProduto });

  test('envia os dados na organização, avisa o sucesso e volta à tela de produtos', async ({ page }) => {
    await openForm(page);
    await fillForm(page);
    const request = saveRequest(page, 'POST', `/v1/organizations/${ORGANIZATION_ID}/products/`);
    await page.getByRole('button', { name: 'CRIAR' }).click();
    expect((await request).postDataJSON()).toMatchObject({
      name: 'Novo Produto',
      description: 'Produto de teste',
      organizationId: ORGANIZATION_ID
    });
    await expect(page.getByText('Produto criado com sucesso!')).toBeVisible();
    await expect(page).toHaveURL(/\/products\/?$/);
  });
});

test.describe('@LEG00.02-CA3 Falha ao criar: mensagem e o usuário continua no formulário', () => {
  test.describe('nome repetido', () => {
    test.use({ scenario: produtoNomeRepetido });

    // defeito BUG00.04: o service traduz para "produto" e a tela compara com "Produto"; aparece o erro genérico
    test.fixme('avisa que já existe um produto com o nome', async ({ page }) => {
      await openForm(page);
      await fillForm(page);
      await page.getByRole('button', { name: 'CRIAR' }).click();
      await expect(page.getByText(/Já existe um produto com este nome\./i)).toBeVisible();
      await expect(page.getByLabel(NAME)).toHaveValue('Novo Produto');
    });
  });

  test.describe('erro do Service', () => {
    test.use({ scenario: produtoErro500 });

    test('avisa o erro sem detalhe técnico', async ({ page }) => {
      await openForm(page);
      await fillForm(page);
      await page.getByRole('button', { name: 'CRIAR' }).click();
      await expect(page.getByText('Erro ao criar o Produto!')).toBeVisible();
      await expect(page.getByText(/500|Erro interno/)).toHaveCount(0);
      await expect(page.getByLabel(NAME)).toHaveValue('Novo Produto');
    });
  });
});

test.describe('@LEG00.02-CA4 "Voltar" sai do cadastro sem criar', () => {
  test.use({ scenario: telaDeProdutos });

  test('volta à tela de produtos sem enviar nada', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => request.method() === 'POST' && posts.push(request.url()));
    await openForm(page);
    await fillForm(page);
    await page.getByRole('button', { name: 'VOLTAR' }).click();
    await expect(page).toHaveURL(/\/products\/?$/);
    expect(posts.filter((url) => url.includes('/products'))).toEqual([]);
  });
});

test.describe('@LEG00.02-CA5 Editar produto', () => {
  test.use({ scenario: editaProduto });

  test('o formulário vem preenchido e salvar grava a alteração', async ({ page }) => {
    await openForm(page, PRODUCT_EDIT_PATH);
    await expect(page.getByText('EDITAR PRODUTO')).toBeVisible();
    await expect(page.getByLabel(NAME)).toHaveValue('MeasureSoftGram');

    await page.getByLabel(DESCRIPTION).fill('Nova descrição');
    const request = saveRequest(page, 'PUT', `/v1/organizations/${ORGANIZATION_ID}/products/${PRODUCT_ID}/`);
    await page.getByRole('button', { name: 'SALVAR' }).click();
    expect((await request).postDataJSON()).toMatchObject({ name: 'MeasureSoftGram', description: 'Nova descrição' });
    await expect(page.getByText('Produto atualizado com sucesso!')).toBeVisible();
    await expect(page).toHaveURL(/\/products\/?$/);
  });

  // nenhuma tela leva à edição: só a URL com id_product abre o formulário preenchido
  test.skip('chegar à edição por um botão da interface (manual: não existe)', async () => {});
});
