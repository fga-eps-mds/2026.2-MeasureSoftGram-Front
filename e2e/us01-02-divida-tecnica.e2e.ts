import { readFileSync } from 'fs';
import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ENTIDADE_PATH, entidade, TEMPORAL_PATH, temporal } from './fixtures/divida-tecnica';

// a tela do repositório ainda não mostra medidas (TASK23.01.03): os critérios são conferidos na Análise por Entidade
// e na Evolução Temporal, a proposta do plano; o nome da medida vem do Service
const MEASURE = 'Technical Debt Ratio';

// sem idioma salvo o app abre em inglês; os critérios estão em português
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
});

const heatmap = (page: Page) => page.getByRole('table', { name: 'Mapa de calor' });
/** A célula do mapa é um botão cujo nome começa por "<repositório> · <entidade>: <valor>". */
const cell = (page: Page, name: string) => heatmap(page).getByRole('button', { name });

/** Abre a Análise por Entidade (nível medida, release atual) e espera o mapa desenhar. */
async function openEntidade(page: Page) {
  await page.goto(ENTIDADE_PATH);
  await expect(page.getByRole('heading', { level: 1, name: '4. Análise por Entidade' })).toBeVisible();
  await expect(page.getByTestId('entity-heatmap')).toHaveAttribute('data-render-ms', /^\d+$/);
}

/** Troca o nível do mapa; o clique logo depois da carga às vezes não pega, então tenta de novo até a aba mudar. */
async function chooseLevel(page: Page, label: string) {
  const tab = page.getByRole('tablist', { name: 'Nível do modelo' }).getByRole('tab', { name: label, exact: true });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
  }).toPass();
  await expect(page.getByTestId('entity-level-path')).toContainText(label.toLowerCase());
}

/** O cabeçalho filho fica dentro da largura do cabeçalho do grupo (colspan) acima dele. */
async function expectUnder(child: Locator, group: Locator) {
  const [childBox, groupBox] = await Promise.all([child.boundingBox(), group.boundingBox()]);
  expect(childBox && groupBox).toBeTruthy();
  if (!childBox || !groupBox) return;
  expect(childBox.x).toBeGreaterThanOrEqual(groupBox.x);
  expect(childBox.x + childBox.width).toBeLessThanOrEqual(groupBox.x + groupBox.width);
}

/** Abre o diálogo da célula e devolve a tabela com os filhos dela. */
async function openChildren(page: Page, cellName: string, entity: string) {
  await cell(page, cellName).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog.getByRole('table', { name: `Filhos de ${entity}` });
}

const childRow = (table: Locator, name: string) => table.getByRole('row').filter({ hasText: name }).getByRole('cell');

const select = (page: Page, label: string) => page.getByRole('combobox', { name: new RegExp(`^${label}`) });

async function choose(page: Page, label: string, option: string) {
  await select(page, label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Abre a Evolução Temporal e espera os filtros carregarem a árvore (a primeira característica vem escolhida). */
async function openTemporal(page: Page) {
  await page.goto(TEMPORAL_PATH);
  await expect(page.getByRole('heading', { level: 1, name: '2. Evolução Temporal' })).toBeVisible();
  await expect(select(page, 'Característica')).toHaveText('Reliability');
}

/** O gráfico é canvas (ECharts): os pontos são conferidos pelo CSV do card, que leva o que o gráfico mostra. */
async function exportMeasures(page: Page): Promise<string[]> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('region', { name: 'Medidas' }).getByRole('button', { name: 'Exportar .csv' }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^msgram-temporal-medidas-\d{4}-\d{2}-\d{2}\.csv$/);
  const content = readFileSync((await download.path()) ?? '', 'utf8');
  expect(content.startsWith('\uFEFF')).toBe(true);
  return content
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
}

// as medidas de Modifiability, em Maintainability; a dívida técnica em três datas, uma na R1 e duas na R2
const MODIFIABILITY_MEASURES_CSV = [
  'Repositório;Entidade;Data;Valor',
  'MeasureSoftGram-Service;Non Complex File Density;2026-07-10;0,7',
  'MeasureSoftGram-Service;Non Complex File Density;2026-10-01;0,66',
  `MeasureSoftGram-Service;${MEASURE};2026-07-10;0,64`,
  `MeasureSoftGram-Service;${MEASURE};2026-09-15;0,6`,
  `MeasureSoftGram-Service;${MEASURE};2026-10-01;0,58`
];

test.describe('@US01.02-CA1 A medida de dívida técnica aparece, associada à característica e à subcaracterística', () => {
  test.use({ scenario: entidade });

  test('no nível medida, a coluna da medida fica sob Maintainability e Modifiability', async ({ page }) => {
    await openEntidade(page);
    const column = heatmap(page).getByRole('columnheader', { name: new RegExp(`^${MEASURE}`) });
    await expect(column).toContainText('technical_debt_ratio');

    const groups = heatmap(page).locator('th[scope="colgroup"]');
    await expect(groups).toHaveText([
      'Reliability · 50%',
      'Maintainability · 50%',
      'Testing Status · 100%',
      'Modifiability · 100%'
    ]);
    await expectUnder(column, groups.filter({ hasText: 'Maintainability' }));
    await expectUnder(column, groups.filter({ hasText: 'Modifiability' }));

    await expect(cell(page, `MeasureSoftGram-Service · ${MEASURE}: 0,58 (C, Bom)`)).toBeVisible();
    await expect(cell(page, `MeasureSoftGram-Action · ${MEASURE}: 0,31 (D, Ruim)`)).toBeVisible();
  });
});

test.describe('@US01.02-CA2 Ao ver a subcaracterística, o valor atual da medida aparece', () => {
  test.use({ scenario: entidade });

  // "atual" é o valor da release atual (R2), o último calculado dentro dela
  test('a composição de Modifiability traz a medida com o valor da release', async ({ page }) => {
    await openEntidade(page);
    await chooseLevel(page, 'Subcaracterística');
    const children = await openChildren(
      page,
      'MeasureSoftGram-Service · Modifiability: 0,62 (B, Muito bom)',
      'Modifiability'
    );
    await expect(childRow(children, MEASURE)).toHaveText([MEASURE, '50%', '0,58 (C, Bom)']);
  });
});

test.describe('@US01.02-CA3 A evolução da medida ao longo das releases', () => {
  test.use({ scenario: temporal });

  // o eixo do gráfico é por data, não por release: as datas cobrem a R1 e a R2
  test('o CSV do gráfico de Medidas traz a medida em datas diferentes', async ({ page }) => {
    await openTemporal(page);
    await choose(page, 'Característica', 'Maintainability');
    await expect(select(page, 'Característica')).toHaveText('Maintainability');
    expect(await exportMeasures(page)).toEqual(MODIFIABILITY_MEASURES_CSV);
  });
});

test.describe('@US01.02-CA4 A medida está no gráfico da subcaracterística', () => {
  test.use({ scenario: temporal });

  // o gráfico "Subcaracterísticas" só desenha subcaracterísticas: o da medida é o de Medidas filtrado por ela
  test('com o filtro em Modifiability, a medida é opção e entra no gráfico de Medidas', async ({ page }) => {
    await openTemporal(page);
    await choose(page, 'Característica', 'Maintainability');
    await choose(page, 'Subcaracterística', 'Modifiability');
    await page.keyboard.press('Escape');
    await expect(select(page, 'Subcaracterística')).toHaveText('Modifiability');

    await select(page, 'Medida').click();
    await expect(page.getByRole('option')).toHaveText(['Todas', 'Non Complex File Density', MEASURE]);
    await page.keyboard.press('Escape');

    expect(await exportMeasures(page)).toEqual(MODIFIABILITY_MEASURES_CSV);
  });
});

test.describe('@US01.02-CA5 Sem cálculo, a medida aparece como indisponível e as demais continuam', () => {
  test.use({ scenario: entidade });

  test('no nível medida, a célula diz "sem dado" e as outras medidas do repositório têm valor', async ({ page }) => {
    await openEntidade(page);
    const missing = cell(page, `MeasureSoftGram-Front · ${MEASURE}: sem dado`);
    await expect(missing).toHaveText('sem dado');
    await Promise.all(
      [
        'MeasureSoftGram-Front · Passed Tests: 0,88 (A, Ótimo)',
        'MeasureSoftGram-Front · CI Feedback Time: 0,47 (C, Bom)',
        'MeasureSoftGram-Front · Non Complex File Density: 0,51 (C, Bom)'
      ].map((name) => expect(cell(page, name)).toBeVisible())
    );
    await expect(page.getByRole('table', { name: 'Ranking dos piores pares' })).toBeVisible();
  });

  test('na composição de Modifiability, a medida diz "sem dado" e a outra medida tem valor', async ({ page }) => {
    await openEntidade(page);
    await chooseLevel(page, 'Subcaracterística');
    const children = await openChildren(page, 'MeasureSoftGram-Front · Modifiability: 0,51 (C, Bom)', 'Modifiability');
    await expect(childRow(children, MEASURE)).toHaveText([MEASURE, '50%', 'sem dado']);
    await expect(childRow(children, 'Non Complex File Density')).toHaveText([
      'Non Complex File Density',
      '50%',
      '0,51 (C, Bom)'
    ]);
  });
});
