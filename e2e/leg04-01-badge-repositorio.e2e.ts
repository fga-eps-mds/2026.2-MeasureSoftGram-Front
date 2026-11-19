import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { comDados, REPOSITORY_API, REPOSITORY_PATH } from './fixtures/repositorio';
import characteristics from './fixtures/temporal/historical-characteristics.json';

/**
 * US04 de 2026.1 (Action#5, "Gerar badge de status do repositório"): a badge TSQMI na página do repositório, o modal
 * com o Markdown para o README e o aviso de badge desatualizada. O SVG em si (nota, cor, "N/A" cinza) sai do Service e
 * não entra aqui.
 */
const COPY = 'Copiar Badge';
const STALE = 'Badge desatualizada';
/** As características do histórico do repositório: Functional Suitability ainda não tem medição. */
const CHARACTERISTICS = characteristics.results.map(({ key }) => key);

/** O último TSQMI de hoje: a badge está em dia. */
const tsqmiRecente = {
  ...comDados,
  [REPOSITORY_API.tsqmi]: { id: 1, value: 0.62, created_at: new Date().toISOString() }
};

/** O último TSQMI de 40 dias atrás: passou dos 30 dias (BADGE_STALENESS_DAYS). */
const tsqmiAntigo = {
  ...comDados,
  [REPOSITORY_API.tsqmi]: { id: 1, value: 0.62, created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }
};

async function openRepository(page: Page) {
  await page.goto(REPOSITORY_PATH);
  await expect(page.getByAltText('TSQMI Badge')).toBeVisible();
}

/** O botão de cópia ao lado da badge (o Tooltip não cria elemento: o pai da imagem é a linha da badge). */
const copyButtonOf = (page: Page, alt: string) =>
  page.getByAltText(alt).locator('xpath=..').getByRole('button', { name: COPY });
const copyButton = (page: Page) => copyButtonOf(page, 'TSQMI Badge');

test.describe('@LEG04.01-CA1 Badge TSQMI do repositório analisado, com o Markdown para copiar', () => {
  test.use({ scenario: tsqmiRecente });

  test('a página mostra a badge da rota do Service', async ({ page }) => {
    await openRepository(page);
    await expect(page.getByAltText('TSQMI Badge')).toHaveAttribute(
      'src',
      new RegExp(`${REPOSITORY_API.badge.replace(/\//g, '\\/')}$`)
    );
  });

  test('o modal "Copiar Badge" mostra o Markdown com a URL da badge', async ({ page }) => {
    await openRepository(page);
    await copyButton(page).click();
    const modal = page.getByRole('presentation').filter({ hasText: 'Cole o código abaixo no README' });
    await expect(modal).toContainText(/!\[MeasureSoftGram\]\(https?:\/\/.+\/latest-values\/tsqmi\/badge\/\)/);
  });
});

test.describe('@LEG04.01-CA2 Uma badge por característica, cada uma com o botão de copiar', () => {
  test.use({ scenario: tsqmiRecente });

  test('a página mostra a badge de cada característica configurada, também a sem medição', async ({ page }) => {
    await openRepository(page);
    await expect(page.getByText('Badges de Características')).toBeVisible();
    for (const key of CHARACTERISTICS) {
      await expect(page.getByAltText(`${key} Badge`)).toHaveAttribute(
        'src',
        new RegExp(`${REPOSITORY_API.characteristicBadge(key).replace(/\//g, '\\/')}$`)
      );
    }
  });

  test('o botão ao lado da badge copia o Markdown daquela característica', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRepository(page);
    const [key] = CHARACTERISTICS;
    await copyButtonOf(page, `${key} Badge`).click();
    await expect(page.getByText(`![${key}](`)).toBeVisible();
    await page.getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(page.getByText('Badge copiada com sucesso!')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(new RegExp(`^!\\[${key}\\]\\(.+/latest-values/characteristics/${key}/badge/\\)$`));
  });
});

test.describe('@LEG04.01-CA3 Badge sem análise há mais de 30 dias', () => {
  test.describe('análise antiga', () => {
    test.use({ scenario: tsqmiAntigo });

    test('a página avisa que a badge está desatualizada', async ({ page }) => {
      await openRepository(page);
      await expect(page.getByRole('button', { name: STALE })).toBeVisible();
    });
  });

  test.describe('análise recente', () => {
    test.use({ scenario: tsqmiRecente });

    test('sem o aviso', async ({ page }) => {
      await openRepository(page);
      await expect(copyButton(page)).toBeVisible();
      await expect(page.getByRole('button', { name: STALE })).toHaveCount(0);
    });
  });

  // o SVG cinza com "N/A" é gerado pelo Service: fica nos testes dele
  test.skip('a rota da badge devolve o SVG cinza "N/A" (fora do Front)', async () => {});
});

test.describe('@LEG04.01-CA4 Retorno ao copiar a badge', () => {
  test.use({ scenario: tsqmiRecente });

  test('cópia bem-sucedida: toast de sucesso e o Markdown na área de transferência', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openRepository(page);
    await copyButton(page).click();
    await page.getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(page.getByText('Badge copiada com sucesso!')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^!\[MeasureSoftGram\]\(.+\/latest-values\/tsqmi\/badge\/\)$/);
  });

  test('cópia negada: toast de erro', async ({ page }) => {
    // o navegador recusa a escrita, como sem permissão da área de transferência
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('negado')) },
        configurable: true
      });
    });
    await openRepository(page);
    await copyButton(page).click();
    await page.getByRole('button', { name: 'Copiar', exact: true }).click();
    await expect(page.getByText('Falha ao copiar para a área de transferência.')).toBeVisible();
  });
});
