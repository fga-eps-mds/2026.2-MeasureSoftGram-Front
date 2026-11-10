import { readFileSync } from 'fs';
import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH, releases } from './fixtures/common';
import * as overview from './fixtures/overview';
import * as temporal from './fixtures/temporal';
import * as repositorio from './fixtures/repositorio';

const OVERVIEW_TITLE = '1. Visão Geral de Qualidade';
const TEMPORAL_TITLE = '2. Evolução Temporal';
const TOTALS = 'Totais da release';
const INDICATOR = 'Indicador Total da Qualidade';
const PLANNED = 'Planejado × Realizado do repositório';
const PULSE = 'Indicador das Características';
/** Os 4 gráficos da Evolução Temporal, de cima para baixo. */
const TEMPORAL_CHARTS = ['Característica', 'Subcaracterísticas', 'Medidas', 'Métricas'];
const TECHNICAL_DETAILS = /500|Erro interno|Request failed/;

/**
 * Faixas A a E com as cores de src/shared/utils/qualityBands.ts, a paleta do guia de IDV que o código usa. A issue
 * lista outras (#1A9641 …); o PO disse em 08/10 que as da issue são referência e valem as do IDV.
 */
const BANDS = [
  { label: 'A · Ótimo (0,80 a 1,00)', color: 'rgb(4, 114, 77)' },
  { label: 'B · Muito bom (0,60 a 0,79)', color: 'rgb(13, 200, 137)' },
  { label: 'C · Bom (0,40 a 0,59)', color: 'rgb(235, 161, 51)' },
  { label: 'D · Ruim (0,20 a 0,39)', color: 'rgb(241, 97, 65)' },
  { label: 'E · Muito ruim (0,00 a 0,19)', color: 'rgb(190, 46, 14)' }
];

// sem idioma salvo o app abre em inglês; os critérios estão em português
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
});

/** O cartão de um gráfico (section com aria-label); exato, porque "Característica" está em "Subcaracterísticas". */
const card = (page: Page, title: string) => page.getByRole('region', { name: title, exact: true });

/** Os seletores da tela: o nome acessível do combobox do MUI começa pelo rótulo. */
const select = (page: Page, label: string) => page.getByRole('combobox', { name: new RegExp(`^${label}`) });

async function choose(page: Page, label: string, option: string) {
  await select(page, label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** As opções de um seletor, com a lista fechada depois. */
async function expectOptions(page: Page, label: string, options: string[]) {
  await select(page, label).click();
  await expect(page.getByRole('option')).toHaveText(options);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

/** Baixa o CSV do botão e devolve as linhas, sem a marca de ordem de bytes do começo. */
async function downloadCsv(page: Page, button: Locator, fileName: RegExp): Promise<string[]> {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toMatch(fileName);
  const content = readFileSync((await download.path()) ?? '', 'utf8');
  // o Excel em português precisa da marca de ordem de bytes para os acentos e do ";" entre as colunas
  expect(content.startsWith('\uFEFF')).toBe(true);
  return content
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
}

const exportButton = (page: Page, title: string) =>
  card(page, title).getByRole('button', { name: 'Exportar .csv', exact: true });

/** Mensagem do guia de IDV: aviso (role=status) ou erro (role=alert), com o título dado. */
const message = (scope: Locator, severity: 'warning' | 'error', title: string) =>
  scope.getByRole(severity === 'error' ? 'alert' : 'status').filter({ hasText: title });

async function expectWarning(scope: Locator, title: string, description: string | RegExp) {
  const warning = message(scope, 'warning', title);
  await expect(warning).toHaveAttribute('data-severity', 'warning');
  await expect(warning).toContainText(description);
}

/** Erro do guia de IDV com "Tentar novamente" e sem código, exceção ou mensagem do servidor. */
async function expectError(scope: Locator, title: string) {
  const error = message(scope, 'error', title);
  await expect(error).toHaveAttribute('data-severity', 'error');
  await expect(error.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expect(error).not.toContainText(TECHNICAL_DETAILS);
}

// ---------------------------------------------------------------- Visão Geral

const vectors = (page: Page) => card(page, PLANNED).getByRole('table', { name: 'Exibir valores' });
const rowCells = (page: Page, testId: string) => vectors(page).getByTestId(testId).getByRole('cell');
const totals = (page: Page) => card(page, TOTALS).getByTestId('overview-total');

/** Abre a Visão Geral e espera os três cards com dados. */
async function openOverview(page: Page) {
  await page.goto(overview.OVERVIEW_PATH);
  await expect(page.getByRole('heading', { level: 1, name: OVERVIEW_TITLE })).toBeVisible();
  await expect(totals(page).first()).toHaveText('2Características');
  await expect(exportButton(page, INDICATOR)).toBeEnabled();
  await expect(card(page, PLANNED).getByTestId('planned-vs-accomplished-equalizer')).toBeVisible();
}

const indicatorCsv = (page: Page) =>
  downloadCsv(page, exportButton(page, INDICATOR), /^msgram-overview-indicador-\d{4}-\d{2}-\d{2}\.csv$/);
const radarCsv = (page: Page) =>
  downloadCsv(
    page,
    card(page, PLANNED).getByRole('button', { name: 'Exportar .csv do radar' }),
    /^msgram-overview-radar-\d{4}-\d{2}-\d{2}\.csv$/
  );

// ---------------------------------------------------------------- Evolução Temporal

const temporalCsv = (page: Page, title: string) =>
  downloadCsv(page, exportButton(page, title), /^msgram-temporal-\w+-\d{4}-\d{2}-\d{2}\.csv$/);

/** Abre a Evolução Temporal e espera os 4 gráficos com dados. */
async function openTemporal(page: Page) {
  await page.goto(temporal.TEMPORAL_PATH);
  await expect(page.getByRole('heading', { level: 1, name: TEMPORAL_TITLE })).toBeVisible();
  await Promise.all(TEMPORAL_CHARTS.map((title) => expect(exportButton(page, title)).toBeEnabled()));
}

// ---------------------------------------------------------------- Repositório

/**
 * A faixa lateral de uma característica no pulso: o nome fica num texto com title, dentro da linha do nome, dentro da
 * faixa (PulseChartRepoSidebar), que tem a altura da faixa do gráfico.
 */
const pulseRow = (page: Page, name: string) =>
  card(page, PULSE).getByTitle(name, { exact: true }).locator('xpath=../..');

/** Abre a tela do repositório e espera o nome no cabeçalho e o pulso com dados. */
async function openRepository(page: Page) {
  await page.goto(repositorio.REPOSITORY_PATH);
  await expect(page.getByRole('heading', { name: 'MeasureSoftGram-Service' })).toBeVisible();
  await expect(exportButton(page, PULSE)).toBeEnabled();
}

const pulseCsv = (page: Page) =>
  downloadCsv(page, exportButton(page, PULSE), /^msgram-repositorio-pulso-\d{4}-\d{2}-\d{2}\.csv$/);

test.describe('@US07.01-CA1 Visão Geral da release: totais, indicador por repositório, planejado × realizado e radar', () => {
  test.use({ scenario: overview.comDados });

  test('abre na release atual com os totais do modelo, de repositórios e de arquivos', async ({ page }) => {
    await openOverview(page);
    await expect(select(page, 'Release')).toHaveText('R2 (atual)');
    await expect(totals(page)).toHaveText([
      '2Características',
      '2Subcaracterísticas',
      '3Medidas',
      '4Métricas',
      '2Repositórios',
      '1.284Arquivos analisados'
    ]);
  });

  test('o Indicador Total da Qualidade de cada repositório analisado, com o grau, e a legenda das faixas', async ({
    page
  }) => {
    await openOverview(page);
    // da melhor para a pior faixa, como no protótipo
    await expect(card(page, INDICATOR).getByTestId('quality-bands-legend').locator('p')).toHaveText([
      'Faixas',
      ...BANDS.map((band) => band.label)
    ]);
    // as barras são canvas: o CSV traz o que elas mostram, do maior para o menor; o Action não tem análise na R2
    expect(await indicatorCsv(page)).toEqual([
      'Release;Repositório;Indicador;Grau',
      'R2;MeasureSoftGram-Service;0,62;B',
      'R2;MeasureSoftGram-Front;0,58;C'
    ]);
  });

  // a cor de cada barra só aparece no desenho do canvas; a baseline é gerada no CI
  test('desenho das barras com a cor da faixa de cada valor (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openOverview(page);
    await expect(card(page, INDICATOR).locator('canvas')).toBeVisible();
    await expect(card(page, INDICATOR)).toHaveScreenshot('overview-indicador.png');
  });

  test('o planejado × realizado é o equalizador da tela da release, no repositório escolhido', async ({ page }) => {
    await openOverview(page);
    // o Action vem primeiro, mas sem realizado: o card abre no primeiro repositório com análise
    await expect(select(page, 'Repositório')).toHaveText('MeasureSoftGram-Service');
    await expect(card(page, PLANNED).getByTestId(/^equalizer-track-/)).toHaveCount(2);
    await expect(vectors(page).getByRole('columnheader')).toHaveText(['', 'Confiabilidade', 'Manutenibilidade']);
    await expect(rowCells(page, 'vector-rp')).toHaveText(['0.70', '0.60']);
    await expect(rowCells(page, 'vector-rd')).toHaveText(['0.74', '0.55']);
    await expect(rowCells(page, 'vector-delta')).toHaveText(['-0.04', '0.05']);
    await expect(card(page, PLANNED).getByTestId('equalizer-norm-diff')).toHaveText('Diferença normalizada: 0.07');
  });

  test('o radar tem os mesmos valores do realizado (Rd), e os dois seguem o seletor de repositório', async ({
    page
  }) => {
    await openOverview(page);
    expect(await radarCsv(page)).toEqual([
      'Release;Repositório;Característica;Valor',
      'R2;MeasureSoftGram-Service;Confiabilidade;0,74',
      'R2;MeasureSoftGram-Service;Manutenibilidade;0,55'
    ]);

    await choose(page, 'Repositório', 'MeasureSoftGram-Front');
    await expect(rowCells(page, 'vector-rd')).toHaveText(['0.80', 'Sem dado']);
    await expect(card(page, PLANNED).getByTestId('equalizer-norm-diff')).toHaveText('Diferença normalizada: 0.10');
    await expect(card(page, PLANNED)).toContainText(
      'Mesmos valores do realizado (Rd) do repositório MeasureSoftGram-Front na release R2.'
    );
    // sem realizado, o eixo fica sem valor, como fica sem ponto no radar
    expect(await radarCsv(page)).toEqual([
      'Release;Repositório;Característica;Valor',
      'R2;MeasureSoftGram-Front;Confiabilidade;0,8',
      'R2;MeasureSoftGram-Front;Manutenibilidade;'
    ]);
  });

  test('a troca de release atualiza os totais, o indicador e o planejado × realizado', async ({ page }) => {
    await openOverview(page);
    await select(page, 'Release').click();
    await expect(page.getByRole('option')).toHaveText(['R2 (atual)', 'R1']);
    await page.getByRole('option', { name: 'R1', exact: true }).click();

    await expect(select(page, 'Release')).toHaveText('R1');
    await expect(totals(page).nth(4)).toHaveText('1Repositórios');
    await expect(totals(page).nth(5)).toHaveText('312Arquivos analisados');
    await expect(rowCells(page, 'vector-rd')).toHaveText(['0.50', '0.45']);
    expect(await indicatorCsv(page)).toEqual([
      'Release;Repositório;Indicador;Grau',
      'R1;MeasureSoftGram-Front;0,81;A',
      'R1;MeasureSoftGram-Service;0,45;C'
    ]);
  });
});

test.describe('@US07.01-CA2 Evolução Temporal: 4 gráficos, filtros em cascata e eixo em dias ou meses', () => {
  test.use({ scenario: temporal.comDados });

  test('os 4 gráficos ficam um abaixo do outro, no primeiro repositório e na primeira característica', async ({
    page
  }) => {
    await openTemporal(page);
    await expect(select(page, 'Repositório')).toHaveText('MeasureSoftGram-Service');
    await expect(select(page, 'Característica')).toHaveText('Reliability');
    await Promise.all(
      ['Subcaracterística', 'Medida', 'Métrica'].map((label) => expect(select(page, label)).toHaveText('Todas'))
    );

    const boxes = await Promise.all(TEMPORAL_CHARTS.map((title) => card(page, title).boundingBox()));
    const tops = boxes.map((box) => box?.y ?? Number.NaN);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(TEMPORAL_CHARTS.length);
  });

  test('cada filtro só oferece as filhas do que foi escolhido no nível anterior', async ({ page }) => {
    await openTemporal(page);
    await expectOptions(page, 'Característica', ['Reliability', 'Maintainability']);
    await expectOptions(page, 'Subcaracterística', ['Todas', 'Testing Status']);
    await expectOptions(page, 'Medida', ['Todas', 'Passed Tests', 'CI Feedback Time']);
    // tests só tem valor por arquivo (qualifier diferente de TRK) e fica fora da lista
    await expectOptions(page, 'Métrica', ['Todas', 'sum_ci_feedback_times', 'total_builds']);

    await choose(page, 'Característica', 'Maintainability');
    await expectOptions(page, 'Subcaracterística', ['Todas', 'Modifiability']);
    await expectOptions(page, 'Medida', ['Todas', 'Non Complex File Density']);
    // complexity também é só por arquivo: a medida fica sem métrica do repositório inteiro
    await expect(select(page, 'Métrica')).toBeDisabled();
  });

  test('o que é escolhido num nível define os gráficos dos níveis seguintes', async ({ page }) => {
    await openTemporal(page);
    await choose(page, 'Característica', 'Maintainability');
    expect(await temporalCsv(page, 'Subcaracterísticas')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Service;Modifiability;2026-08-20;0,8',
      'MeasureSoftGram-Service;Modifiability;2026-10-10;0,4'
    ]);

    await choose(page, 'Característica', 'Reliability');
    await choose(page, 'Medida', 'CI Feedback Time');
    await page.keyboard.press('Escape');
    await expect(select(page, 'Medida')).toHaveText('CI Feedback Time');
    expect(await temporalCsv(page, 'Medidas')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Service;CI Feedback Time;2026-08-20;0,3',
      'MeasureSoftGram-Service;CI Feedback Time;2026-09-25;0,4'
    ]);
    expect(await temporalCsv(page, 'Métricas')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Service;sum_ci_feedback_times;2026-08-20;5400',
      'MeasureSoftGram-Service;sum_ci_feedback_times;2026-09-25;4200',
      'MeasureSoftGram-Service;total_builds;2026-08-20;15',
      'MeasureSoftGram-Service;total_builds;2026-09-25;18'
    ]);
  });

  test('a troca de repositório mostra os históricos do repositório escolhido', async ({ page }) => {
    await openTemporal(page);
    await choose(page, 'Repositório', 'MeasureSoftGram-Front');
    await expect(select(page, 'Repositório')).toHaveText('MeasureSoftGram-Front');
    // o Front só tem a última medição de cada característica
    expect(await temporalCsv(page, 'Característica')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Front;Reliability;2026-10-10;0,58'
    ]);
  });

  test('o eixo do tempo abre em dias e troca para meses, com a última medição de cada mês', async ({ page }) => {
    await openTemporal(page);
    const axis = page.getByRole('group', { name: 'Eixo do tempo' });
    const days = axis.getByRole('button', { name: 'Dias', exact: true });
    const months = axis.getByRole('button', { name: 'Meses', exact: true });
    await expect(days).toHaveAttribute('aria-pressed', 'true');
    await expect(months).toHaveAttribute('aria-pressed', 'false');
    expect(await temporalCsv(page, 'Característica')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Service;Reliability;2026-07-20;0,48',
      'MeasureSoftGram-Service;Reliability;2026-08-20;0,55',
      'MeasureSoftGram-Service;Reliability;2026-09-03;0,62',
      'MeasureSoftGram-Service;Reliability;2026-09-25;0,66',
      'MeasureSoftGram-Service;Reliability;2026-10-10;0,58'
    ]);

    await expect(async () => {
      await months.click();
      await expect(months).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
    }).toPass();
    await expect(days).toHaveAttribute('aria-pressed', 'false');
    expect(await temporalCsv(page, 'Característica')).toEqual([
      'Repositório;Entidade;Data;Valor',
      'MeasureSoftGram-Service;Reliability;2026-07;0,48',
      'MeasureSoftGram-Service;Reliability;2026-08;0,55',
      'MeasureSoftGram-Service;Reliability;2026-09;0,66',
      'MeasureSoftGram-Service;Reliability;2026-10;0,58'
    ]);
  });
});

test.describe('@US07.01-CA3 Tela do repositório: pulso de cada característica, como o pulso do produto', () => {
  test.use({ scenario: repositorio.comDados });

  test('uma faixa por característica medida, todas da mesma altura, com o último valor e a faixa', async ({ page }) => {
    await openRepository(page);
    const reliability = pulseRow(page, 'Reliability');
    const maintainability = pulseRow(page, 'Maintainability');
    await expect(reliability).toContainText('0.580');
    await expect(reliability).toContainText('último valor · Bom');
    await expect(maintainability).toContainText('0.300');
    await expect(maintainability).toContainText('último valor · Ruim');
    // Functional Suitability não tem medição e fica sem faixa
    await expect(card(page, PULSE).getByTitle('Functional Suitability')).toHaveCount(0);

    const [first, second] = await Promise.all([reliability.boundingBox(), maintainability.boundingBox()]);
    expect(first?.height).toBeGreaterThan(0);
    expect(second?.height).toBe(first?.height);
  });

  test('a legenda das faixas e o "Exportar .csv" com as medições de cada característica', async ({ page }) => {
    await openRepository(page);
    // da pior para a melhor, como no pulso do produto
    await expect(card(page, PULSE).getByText(/^[A-E] · /)).toHaveText(BANDS.map((band) => band.label).reverse());
    expect(await pulseCsv(page)).toEqual([
      'Repositório;Característica;Data;Valor;Grau',
      'MeasureSoftGram-Service;Reliability;2026-07-20T12:00:00-03:00;0,48;C',
      'MeasureSoftGram-Service;Reliability;2026-08-20T12:00:00-03:00;0,55;C',
      'MeasureSoftGram-Service;Reliability;2026-09-03T12:00:00-03:00;0,62;B',
      'MeasureSoftGram-Service;Reliability;2026-09-25T12:00:00-03:00;0,66;B',
      'MeasureSoftGram-Service;Reliability;2026-10-10T12:00:00-03:00;0,58;C',
      'MeasureSoftGram-Service;Maintainability;2026-08-20T12:00:00-03:00;0,82;A',
      'MeasureSoftGram-Service;Maintainability;2026-09-25T12:00:00-03:00;0,78;B',
      'MeasureSoftGram-Service;Maintainability;2026-10-10T12:00:00-03:00;0,35;D',
      'MeasureSoftGram-Service;Maintainability;2026-10-20T12:00:00-03:00;0,3;D'
    ]);
  });

  // as duas características trocam de faixa duas vezes no período escolhido; com uma troca só, o pulso quebra (fixme abaixo)
  test('o filtro de período De/Até limita o gráfico e o CSV', async ({ page }) => {
    await openRepository(page);
    await page.getByLabel('De', { exact: true }).fill('2026-08-01');
    // a medição de julho sai do período
    await expect(async () => {
      expect(await pulseCsv(page)).toEqual([
        'Repositório;Característica;Data;Valor;Grau',
        'MeasureSoftGram-Service;Reliability;2026-08-20T12:00:00-03:00;0,55;C',
        'MeasureSoftGram-Service;Reliability;2026-09-03T12:00:00-03:00;0,62;B',
        'MeasureSoftGram-Service;Reliability;2026-09-25T12:00:00-03:00;0,66;B',
        'MeasureSoftGram-Service;Reliability;2026-10-10T12:00:00-03:00;0,58;C',
        'MeasureSoftGram-Service;Maintainability;2026-08-20T12:00:00-03:00;0,82;A',
        'MeasureSoftGram-Service;Maintainability;2026-09-25T12:00:00-03:00;0,78;B',
        'MeasureSoftGram-Service;Maintainability;2026-10-10T12:00:00-03:00;0,35;D',
        'MeasureSoftGram-Service;Maintainability;2026-10-20T12:00:00-03:00;0,3;D'
      ]);
    }).toPass();

    await page.getByLabel('De', { exact: true }).fill('2026-11-01');
    await expect(card(page, PULSE)).toContainText('Nenhuma medição no período selecionado. Ajuste as datas De/Até.');
    await expect(exportButton(page, PULSE)).toBeDisabled();
  });

  test.describe('característica que troca de faixa uma vez só', () => {
    test.use({ scenario: repositorio.umaTrocaDeFaixa });

    test.fixme(
      'o pulso é desenhado e o período pode ser trocado (bug: com uma única troca de faixa, o ECharts lança "Cannot read properties of undefined (reading \'coord\')" e o pulso fica sem linha; se a troca aparece ao mudar o período ou no "Tentar novamente", a tela vira "Application error")',
      async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await openRepository(page);
        await page.getByLabel('De', { exact: true }).fill('2026-09-01');
        await expect(pulseRow(page, 'Reliability')).toContainText('0.660');
        await expect(exportButton(page, PULSE)).toBeEnabled();
        expect(errors).toEqual([]);
      }
    );
  });

  // os marcadores das releases e as cores do pulso só aparecem no desenho do canvas; a baseline é gerada no CI
  test('desenho do pulso: marcadores das releases e cores das faixas (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openRepository(page);
    await expect(card(page, PULSE).locator('canvas')).toBeVisible();
    // o pulso é animado ao desenhar: algumas dezenas de pixels mudam entre execuções
    await expect(card(page, PULSE)).toHaveScreenshot('repositorio-pulso.png', { maxDiffPixels: 200 });
  });

  // o nome da release ao passar o mouse no marcador é tooltip de canvas, sem posição estável no DOM
  test.skip('tooltip do marcador com o nome da release (manual)', async () => {});
});

test.describe('@US07.01-CA4 Carregando, sem dados e erro com "Tentar novamente", sem detalhes técnicos', () => {
  test.describe('Visão Geral', () => {
    test.describe('carregando', () => {
      test.use({ scenario: overview.carregando });

      test('cada card mostra o selo "Carregando" e depois os dados', async ({ page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await Promise.all(
          [TOTALS, INDICATOR, PLANNED].map(async (title) => {
            await expect(card(page, title).getByText('Carregando', { exact: true })).toBeVisible();
            await expect(card(page, title)).toContainText('Carregando os dados da release…');
          })
        );
        await expect(totals(page).first()).toHaveText('2Características');
        await expect(exportButton(page, INDICATOR)).toBeEnabled();
        await expect(page.getByText('Carregando', { exact: true })).toHaveCount(0);
      });
    });

    test.describe('sem análise na release', () => {
      test.use({ scenario: overview.semAnalise });

      test('o indicador e o planejado × realizado explicam o que fazer', async ({ page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await Promise.all(
          [
            [INDICATOR, 'para ver o indicador.'],
            [PLANNED, 'para comparar com o planejado.']
          ].map(async ([title, end]) => {
            await expect(card(page, title).getByText('Sem dados', { exact: true })).toBeVisible();
            await expectWarning(
              card(page, title),
              'Ainda não há análises nesta release',
              `Rode a coleta do MeasureSoftGram (GitHub Action ou CLI) em pelo menos um repositório do produto ${end}`
            );
            await expect(card(page, title).getByRole('link', { name: 'Ver como configurar a coleta' })).toBeVisible();
          })
        );
      });
    });

    test.describe('repositório sem realizado', () => {
      test.use({ scenario: overview.comDados });

      test('o radar avisa que o repositório ainda não tem características calculadas', async ({ page }) => {
        await openOverview(page);
        await choose(page, 'Repositório', 'MeasureSoftGram-Action');
        await expectWarning(
          card(page, PLANNED),
          'Ainda não há análises nesta release',
          'O repositório MeasureSoftGram-Action ainda não tem características calculadas na release R2.'
        );
        await expect(card(page, PLANNED).getByRole('button', { name: 'Exportar .csv do radar' })).toHaveCount(0);
      });
    });

    test.describe('release sem modelo de qualidade', () => {
      test.use({ scenario: overview.semModelo });

      test('os totais do modelo ficam com travessão e o aviso explica por quê', async ({ page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await expectWarning(
          card(page, TOTALS),
          'Esta release não tem modelo de qualidade configurado',
          'A contagem de repositórios e de arquivos analisados não depende dele e segue valendo.'
        );
        await expect(card(page, TOTALS).getByLabel('Não se aplica')).toHaveCount(4);
        await expect(totals(page).nth(4)).toHaveText('2Repositórios');
      });
    });

    test.describe('erro 500', () => {
      test.use({ scenario: overview.erro500 });

      test('cada card mostra o erro com "Tentar novamente", que carrega os dados de novo', async ({ api, page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await Promise.all(
          [TOTALS, INDICATOR, PLANNED].map(async (title) => {
            await expect(card(page, title).getByText('Erro', { exact: true })).toBeVisible();
            await expectError(card(page, title), 'Não foi possível carregar este gráfico');
          })
        );

        api.set(overview.OVERVIEW_API.characteristics, overview.comDados[overview.OVERVIEW_API.characteristics]);
        await card(page, INDICATOR).getByRole('button', { name: 'Tentar novamente' }).click();
        await expect(exportButton(page, INDICATOR)).toBeEnabled();
        // os outros cards continuam com o erro até a nova tentativa deles
        await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(2);
      });
    });

    test.describe('erro na lista de releases', () => {
      test.use({ scenario: overview.erroReleases });

      test('mostra o erro com "Tentar novamente", que abre a release atual', async ({ api, page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await expectError(card(page, 'Releases do produto'), 'Não foi possível carregar este gráfico');

        api.set(overview.OVERVIEW_API.releases, releases);
        await page.getByRole('button', { name: 'Tentar novamente' }).click();
        await expect(select(page, 'Release')).toHaveText('R2 (atual)');
        await expect(totals(page).first()).toHaveText('2Características');
      });
    });

    test.describe('produto sem release', () => {
      test.use({ scenario: overview.semRelease });

      test('convida a criar a primeira release', async ({ page }) => {
        await page.goto(overview.OVERVIEW_PATH);
        await expectWarning(
          card(page, 'Visão Geral da release'),
          'Este produto ainda não tem releases',
          'Crie uma release para acompanhar a qualidade do produto.'
        );
        await expect(page.getByRole('button', { name: 'Criar release' })).toBeVisible();
      });
    });
  });

  test.describe('Evolução Temporal', () => {
    test.describe('carregando', () => {
      test.use({ scenario: temporal.carregando });

      test('cada gráfico mostra o selo "Carregando" e depois os dados', async ({ page }) => {
        await page.goto(temporal.TEMPORAL_PATH);
        await Promise.all(
          TEMPORAL_CHARTS.map(async (title) => {
            await expect(card(page, title).getByText('Carregando', { exact: true })).toBeVisible();
            await expect(card(page, title)).toContainText('Carregando a evolução das');
          })
        );
        await Promise.all(TEMPORAL_CHARTS.map((title) => expect(exportButton(page, title)).toBeEnabled()));
        await expect(page.getByText('Carregando', { exact: true })).toHaveCount(0);
      });
    });

    test.describe('repositório sem medições', () => {
      test.use({ scenario: temporal.semMedicoes });

      test('cada gráfico diz que ainda não há valores e o que fazer', async ({ page }) => {
        await page.goto(temporal.TEMPORAL_PATH);
        const analyzed = 'Os valores aparecem depois que a Action do MeasureSoftGram analisa o repositório.';
        await Promise.all(
          [
            ['Característica', 'Ainda não há valores desta característica neste repositório', analyzed],
            [
              'Subcaracterísticas',
              'Ainda não há valores das subcaracterísticas escolhidas neste repositório',
              analyzed
            ],
            ['Medidas', 'Ainda não há valores das medidas escolhidas neste repositório', analyzed],
            ['Métricas', 'Sem valores de métricas das medidas neste repositório', 'rode a coleta do MeasureSoftGram']
          ].map(async ([title, warning, description]) => {
            await expect(card(page, title).getByText('Sem dados', { exact: true })).toBeVisible();
            await expectWarning(card(page, title), warning, description);
          })
        );
      });
    });

    test.describe('medida só com métricas por arquivo', () => {
      test.use({ scenario: temporal.comDados });

      // decisão do time no reteste de 10/11: é aviso, não erro (o gráfico só busca as métricas com qualifier TRK)
      test('o gráfico de métricas avisa que as métricas por arquivo não aparecem nele', async ({ page }) => {
        await openTemporal(page);
        await choose(page, 'Característica', 'Maintainability');
        await expectWarning(
          card(page, 'Métricas'),
          'Sem valores de métricas das medidas neste repositório',
          'As que são coletadas por arquivo, como as do SonarQube, não aparecem aqui mesmo com a coleta em dia'
        );
        await expect(exportButton(page, 'Medidas')).toBeEnabled();
      });
    });

    test.describe('erro 500', () => {
      test.use({ scenario: temporal.erro500 });

      test('cada gráfico mostra o erro com "Tentar novamente", que carrega os dados de novo', async ({ api, page }) => {
        await page.goto(temporal.TEMPORAL_PATH);
        await Promise.all(
          ['característica', 'subcaracterísticas', 'medidas', 'métricas'].map((label, index) =>
            expectError(card(page, TEMPORAL_CHARTS[index]), `Não foi possível carregar a evolução das ${label}`)
          )
        );

        api.set(
          temporal.TEMPORAL_API.history(7, 'characteristics'),
          temporal.comDados[temporal.TEMPORAL_API.history(7, 'characteristics')]
        );
        await card(page, 'Característica').getByRole('button', { name: 'Tentar novamente' }).click();
        await expect(exportButton(page, 'Característica')).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(3);
      });
    });

    test.describe('produto sem repositório', () => {
      test.use({ scenario: temporal.semRepositorios });

      test('diz que o produto não tem repositórios e o que fazer', async ({ page }) => {
        await page.goto(temporal.TEMPORAL_PATH);
        await expectWarning(
          card(page, 'Evolução Temporal'),
          'Este produto ainda não tem repositórios',
          'Adicione um repositório para acompanhar a evolução da qualidade.'
        );
      });
    });

    test.describe('erro na lista de repositórios', () => {
      test.use({ scenario: temporal.erroRepositorios });

      test.fixme(
        'mostra o erro com "Tentar novamente" (bug: a tela diz "Este produto ainda não tem repositórios")',
        async ({ page }) => {
          await page.goto(temporal.TEMPORAL_PATH);
          await expect(page.getByRole('heading', { level: 1, name: TEMPORAL_TITLE })).toBeVisible();
          await expect(page.getByRole('alert')).toBeVisible();
          await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
          await expect(page.getByText('Este produto ainda não tem repositórios')).toHaveCount(0);
        }
      );
    });
  });

  test.describe('Repositório', () => {
    test.describe('carregando', () => {
      test.use({ scenario: repositorio.carregando });

      test('o pulso mostra o selo "Carregando" e depois as medições', async ({ page }) => {
        await page.goto(repositorio.REPOSITORY_PATH);
        await expect(card(page, PULSE).getByText('Carregando', { exact: true })).toBeVisible();
        await expect(card(page, PULSE)).toContainText('Carregando as medições das características…');
        await expect(exportButton(page, PULSE)).toBeEnabled();
        await expect(card(page, PULSE).getByText('Carregando', { exact: true })).toHaveCount(0);
      });
    });

    test.describe('repositório sem medições', () => {
      test.use({ scenario: repositorio.semMedicoes });

      test('o pulso diz que ainda não há medições e o que fazer', async ({ page }) => {
        await page.goto(repositorio.REPOSITORY_PATH);
        await expect(card(page, PULSE).getByText('Sem dados', { exact: true })).toBeVisible();
        await expectWarning(
          card(page, PULSE),
          'Ainda não há medições das características deste repositório',
          'Os valores aparecem depois que a Action do MeasureSoftGram analisa o repositório.'
        );
      });
    });

    test.describe('erro 500', () => {
      test.use({ scenario: repositorio.erro500 });

      test('o pulso mostra o erro com "Tentar novamente", que carrega as medições de novo', async ({ api, page }) => {
        await page.goto(repositorio.REPOSITORY_PATH);
        await expect(card(page, PULSE).getByText('Erro', { exact: true })).toBeVisible();
        await expectError(card(page, PULSE), 'Não foi possível carregar o indicador das características');

        api.set(
          repositorio.REPOSITORY_API.characteristics,
          repositorio.comDados[repositorio.REPOSITORY_API.characteristics]
        );
        await card(page, PULSE).getByRole('button', { name: 'Tentar novamente' }).click();
        await expect(exportButton(page, PULSE)).toBeEnabled();
        await expect(pulseRow(page, 'Reliability')).toContainText('0.580');
      });
    });

    test.describe('sem acesso ao repositório no provedor', () => {
      test.use({ scenario: repositorio.semAcesso });

      test('avisa que o usuário não tem acesso, sem o erro do servidor', async ({ page }) => {
        await page.goto(repositorio.REPOSITORY_PATH);
        await expect(page.getByText('Você não tem acesso a este repositório no GitHub.')).toBeVisible();
        await expect(page.getByText(/Não encontrado|404/)).toHaveCount(0);
      });
    });
  });
});

/** As três telas da US com dados, para abrir uma depois da outra no mesmo teste. */
const todasAsTelas = { ...overview.comDados, ...temporal.comDados, ...repositorio.comDados };

// CA5 é Fora do Front: quem pode ver é decidido pelo Service. O Front não tem papel de administrador (useRequireAuth só
// exige sessão), e a sessão fake do E2E é de um membro comum da organização, sem nenhuma marca de administrador.
test.describe('@US07.01-CA5 Qualquer membro da organização vê os dashboards', () => {
  test.use({ scenario: todasAsTelas });

  test('a sessão de um membro abre as três telas com os dados', async ({ page }) => {
    await openOverview(page);
    await openTemporal(page);
    await openRepository(page);
  });
});

test.describe('@US07.01-CA6 Nenhuma tela do produto mostra o Grafana', () => {
  test.use({ scenario: todasAsTelas });

  test('nenhum iframe e nenhum pedido ao Grafana no produto, na Visão Geral, na Evolução Temporal e no repositório', async ({
    page
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto(`${PRODUCT_PATH}/`);
    await expect(page.getByText('Dashboards', { exact: true })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);

    await openOverview(page);
    await expect(page.locator('iframe')).toHaveCount(0);
    await openTemporal(page);
    await expect(page.locator('iframe')).toHaveCount(0);
    await openRepository(page);
    await expect(page.locator('iframe')).toHaveCount(0);

    expect(requests.length).toBeGreaterThan(0);
    expect(requests.filter((url) => /grafana/i.test(url))).toEqual([]);
  });
});

test.describe('@US07.01-CA7 Cores dos gráficos do guia de IDV', () => {
  test.describe('legendas e valores', () => {
    test.use({ scenario: todasAsTelas });

    test('a legenda das faixas da Visão Geral usa as cores do guia', async ({ page }) => {
      await openOverview(page);
      const legend = card(page, INDICATOR).getByTestId('quality-bands-legend');
      // o quadrado da cor fica logo antes do rótulo da faixa
      await Promise.all(
        BANDS.map(({ label, color }) =>
          expect(legend.getByText(label, { exact: true }).locator('xpath=preceding-sibling::div[1]')).toHaveCSS(
            'background-color',
            color
          )
        )
      );
    });

    test('a legenda do pulso e o último valor de cada característica usam as cores do guia', async ({ page }) => {
      await openRepository(page);
      await Promise.all(
        BANDS.map(({ label, color }) =>
          expect(
            card(page, PULSE).getByText(label, { exact: true }).locator('xpath=preceding-sibling::div[1]')
          ).toHaveCSS('background-color', color)
        )
      );
      // Reliability termina em 0,58 (C) e Maintainability em 0,30 (D)
      await expect(pulseRow(page, 'Reliability').getByText('0.580')).toHaveCSS('color', BANDS[2].color);
      await expect(pulseRow(page, 'Maintainability').getByText('0.300')).toHaveCSS('color', BANDS[3].color);
    });
  });

  test.describe('desenho', () => {
    test.use({ scenario: temporal.comDados });

    // as linhas da Evolução Temporal só existem no canvas; as barras e o pulso ficam nos snapshots do CA1 e do CA3
    test('linhas da Evolução Temporal (snapshot)', async ({ page }) => {
      test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
      await openTemporal(page);
      await expect(card(page, 'Característica').locator('canvas')).toBeVisible();
      await expect(card(page, 'Característica')).toHaveScreenshot('temporal-caracteristica.png');
    });
  });
});
