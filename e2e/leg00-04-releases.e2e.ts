import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { comDados as releaseComDados } from './fixtures/release';
import { dozeReleases, RELEASES, RELEASES_PATH } from './fixtures/legados';
import { comRepositorios as planejamento } from './fixtures/planejamento-release';

/**
 * Fluxo legado da lista de releases do produto (menu Releases). Sem US de origem: os critérios descrevem o
 * comportamento atual e estão na issue LEG00.04 do DOC. O planejamento é a LEG19.01; a página da release, a US22.01.
 */
const rows = (page: Page) => page.getByTestId('repository-row');
const names = (page: Page) => rows(page).locator('td:first-child');

async function openReleases(page: Page) {
  await page.goto(RELEASES_PATH);
  await expect(page.getByRole('heading', { level: 4, name: 'Releases' })).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
}

test.describe('@LEG00.04-CA1 Lista das releases do produto, 10 por página', () => {
  test.use({ scenario: dozeReleases });

  test('mostra nome, início e fim, e as 2 restantes na página 2', async ({ page }) => {
    await openReleases(page);
    await expect(names(page)).toHaveText(RELEASES.slice(0, 10).map((release) => release.release_name));
    await expect(rows(page).first()).toContainText(/R01.*2026.*2026/);
    await page.getByRole('button', { name: 'Go to page 2' }).click();
    await expect(names(page)).toHaveText(['R11', 'R12']);
  });
});

test.describe('@LEG00.04-CA2 Busca pelo nome da release', () => {
  test.use({ scenario: dozeReleases });

  test('filtra as releases que contêm o texto, sem diferenciar maiúsculas', async ({ page }) => {
    await openReleases(page);
    await page.getByPlaceholder('Insira o nome da release').fill('r1');
    await expect(names(page)).toHaveText(['R10', 'R11', 'R12']);
  });
});

test.describe('@LEG00.04-CA3 Filtro pelas datas de início e de fim', () => {
  test.use({ scenario: dozeReleases });

  test('início: só as releases que começam na data ou depois', async ({ page }) => {
    await openReleases(page);
    await page.getByTestId('inicio-release').fill('2026-10-01');
    await expect(names(page)).toHaveText(['R10', 'R11', 'R12']);
  });

  test('fim: só as releases que terminam na data ou antes', async ({ page }) => {
    await openReleases(page);
    await page.getByTestId('fim-release').fill('2026-02-20');
    await expect(names(page)).toHaveText(['R01', 'R02']);
  });
});

test.describe('@LEG00.04-CA4 Acesso ao detalhe e ao planejamento', () => {
  test.use({ scenario: { ...planejamento, ...dozeReleases, ...releaseComDados } });

  test('clicar numa release abre a página dela', async ({ page }) => {
    await openReleases(page);
    await rows(page).filter({ hasText: 'R02' }).click();
    await expect(page).toHaveURL(/\/releases\/2\/?$/);
  });

  test('"Planejar release" abre o planejamento', async ({ page }) => {
    await openReleases(page);
    await page.getByRole('button', { name: 'Planejar release' }).click();
    await expect(page).toHaveURL(/\/releases\/create\/?$/);
  });
});
