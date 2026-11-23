import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { comRepositorios, RELEASE_CREATE_PATH, REPOSITORIOS } from './fixtures/planejamento-release';

/**
 * US19 de 2026.1 (Service#24, "Planejamento de Release por repositórios selecionados"): no primeiro passo do
 * planejamento, o usuário escolhe quais repositórios do produto entram na release. A gravação dos repositórios na
 * release é do Service.
 */
const STEP_TITLE = 'Selecionar Repositórios da Release';
const NONE_SELECTED = 'Selecione pelo menos um repositório para a release.';

async function openPlanning(page: Page) {
  await page.goto(RELEASE_CREATE_PATH);
  await expect(page.getByRole('heading', { name: STEP_TITLE })).toBeVisible();
  // os repositórios vêm todos marcados quando a lista chega
  await expect(page.getByRole('checkbox')).toHaveCount(REPOSITORIOS.length);
}

/** O card do repositório (o clique vai no card; o checkbox só mostra o estado). */
const repoCard = (page: Page, name: string) =>
  page
    .locator('.MuiPaper-root')
    .filter({ has: page.getByText(name, { exact: true }) })
    .last();

test.describe('@LEG19.01-CA1 Lista em checklist dos repositórios do produto, com marcação individual', () => {
  test.use({ scenario: comRepositorios });

  test('cada repositório aparece com nome, descrição e checkbox', async ({ page }) => {
    await openPlanning(page);
    for (const repo of REPOSITORIOS) {
      const card = repoCard(page, repo.name);
      await expect(card).toContainText(repo.description ?? 'Nenhuma descrição');
      await expect(card.getByRole('checkbox')).toBeChecked();
    }
  });

  test('desmarca e marca um repositório sem mexer no outro', async ({ page }) => {
    await openPlanning(page);
    const [front, service] = REPOSITORIOS.map((repo) => repoCard(page, repo.name));

    await front.click();
    await expect(front.getByRole('checkbox')).not.toBeChecked();
    await expect(service.getByRole('checkbox')).toBeChecked();

    await front.click();
    await expect(front.getByRole('checkbox')).toBeChecked();
  });

  test('com um repositório marcado, avança para o próximo passo', async ({ page }) => {
    await openPlanning(page);
    await repoCard(page, REPOSITORIOS[1].name).click();
    await page.getByRole('button', { name: 'Avançar' }).click();
    await expect(page.getByRole('heading', { name: STEP_TITLE })).toHaveCount(0);
    await expect(page.getByText(NONE_SELECTED)).toHaveCount(0);
  });
});

test.describe('@LEG19.01-CA2 Sem nenhum repositório marcado, o planejamento não avança', () => {
  test.use({ scenario: comRepositorios });

  test('bloqueia o avanço e mostra a mensagem de erro', async ({ page }) => {
    await openPlanning(page);
    for (const repo of REPOSITORIOS) await repoCard(page, repo.name).click();
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Avançar' }).click();
    await expect(page.getByText(NONE_SELECTED)).toBeVisible();
    await expect(page.getByRole('heading', { name: STEP_TITLE })).toBeVisible();
  });
});
