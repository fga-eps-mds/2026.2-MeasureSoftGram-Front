import { readFileSync } from 'fs';
import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import {
  comDados,
  DISTRIBUTION_PATH,
  erro500,
  poucasAnalises,
  semAnalise,
  semProduto,
  semRelease
} from './fixtures/distribuicao';

const TITLE = '5. Distribuição Estatística';
const HISTOGRAM = 'Histograma';
const DENSITY = 'Curva de densidade';
const BOXPLOT = 'Boxplot e percentis do nível';
const SCATTER = 'Dispersão das análises no tempo';
const SUMMARY = 'Resumo estatístico e IQR';
const RULER = 'Faixas de qualidade de A a E';

/** O cartão de um quadro (section com aria-label). */
const card = (page: Page, title: string) => card.in(page, title);
card.in = (page: Page, title: string): Locator => page.getByRole('region', { name: title });

/** Os seletores da tela: o nome acessível do combobox do MUI começa pelo rótulo. */
const select = (page: Page, label: string) => page.getByRole('combobox', { name: new RegExp(`^${label}`) });
const levelButton = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Nível do modelo' }).getByRole('button', { name: label, exact: true });

async function choose(page: Page, label: string, option: string) {
  await select(page, label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/**
 * Abre a página com dados e espera os quadros carregarem: a linha do período só aparece com a distribuição pronta
 * (a grade de esqueletos não tem aria-busy), e só depois os cliques nos filtros valem.
 */
async function openDistribution(page: Page) {
  await page.goto(DISTRIBUTION_PATH);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByTestId('distribution-period')).toBeVisible();
  await expect(page.getByTestId('distribution-grid')).not.toHaveAttribute('aria-busy', 'true');
}

/** O ECharts só desenha em canvas: a descrição para leitor de tela (aria-label) e o tempo de desenho são o DOM. */
async function expectChartDrawn(chart: Locator, description: RegExp) {
  await expect(chart.getByTestId('distribution-chart')).toHaveAttribute('data-render-ms', /^\d+$/);
  await expect(chart.getByLabel(description)).toBeAttached();
}

test.describe('@US21.03-CA1 Item "5. Distribuição Estatística" no submenu Dashboards', () => {
  test.use({ scenario: comDados });

  test('aparece com um produto selecionado e leva à página', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await page.getByText('Dashboards', { exact: true }).click();
    await page.getByText(TITLE, { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/distribuicao\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });

  test.describe('sem produto', () => {
    test.use({ scenario: semProduto });

    test('não aparece sem produto selecionado', async ({ page }) => {
      await page.goto('/home/');
      // o menu lateral já montou quando o nome do usuário aparece
      await expect(page.getByText('usuario-mock')).toBeVisible();
      await expect(page.getByText('Dashboards', { exact: true })).toHaveCount(0);
    });
  });
});

test.describe('@US21.03-CA2 Seleção de release, repositório, nível e entidade em cascata', () => {
  test.use({ scenario: comDados });

  test('abre na release atual, no primeiro repositório com análise e no TSQMI', async ({ page }) => {
    await openDistribution(page);
    await expect(select(page, 'Release')).toHaveText('R2 (atual)');
    await expect(select(page, 'Repositório')).toHaveText('MeasureSoftGram-Service');
    await expect(levelButton(page, 'TSQMI')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('entity-selectors')).toHaveCount(0);
    await expect(page.getByTestId('distribution-subtitle')).toContainText('Como os valores de TSQMI');
  });

  test('a troca de repositório e de release atualiza a página', async ({ page }) => {
    await openDistribution(page);
    await choose(page, 'Repositório', 'MeasureSoftGram-Front');
    await expect(page.getByTestId('distribution-period')).toContainText('MeasureSoftGram-Front');
    await expect(select(page, 'Repositório')).toHaveText('MeasureSoftGram-Front');

    await choose(page, 'Release', 'R1');
    await expect(page.getByTestId('distribution-period')).toContainText('Release R1');
    await expect(page.getByTestId('distribution-grid')).not.toHaveAttribute('aria-busy', 'true');
  });

  test('o repositório sem análise na release fica avisado na lista', async ({ page }) => {
    await openDistribution(page);
    await select(page, 'Repositório').click();
    await expect(page.getByRole('option')).toHaveText([
      'MeasureSoftGram-Action (sem análise na release)',
      'MeasureSoftGram-Service',
      'MeasureSoftGram-Front'
    ]);
  });

  test('no nível característica, só as características da configuração da release', async ({ page }) => {
    await openDistribution(page);
    await levelButton(page, 'Característica').click();
    await expect(page.getByTestId('distribution-subtitle')).toContainText('Como os valores de Reliability');
    await expectChartDrawn(card(page, HISTOGRAM), /^Histograma de Reliability/);

    await select(page, 'Característica').click();
    await expect(page.getByRole('option')).toHaveText(['Reliability', 'Maintainability']);
  });

  test('no nível métrica, só as métricas com valor por análise, e cada escolha atualiza os gráficos', async ({
    page
  }) => {
    await openDistribution(page);
    await levelButton(page, 'Métrica').click();
    // um seletor por nível, do topo até a métrica
    await expect(page.getByTestId('entity-selectors').getByRole('combobox')).toHaveCount(4);
    await expect(page.getByTestId('distribution-subtitle')).toContainText('Como os valores de sum_ci_feedback_times');

    // tests e complexity são por arquivo (SonarQube) e ficam fora da lista
    await select(page, 'Métrica').click();
    await expect(page.getByRole('option')).toHaveText(['sum_ci_feedback_times', 'total_builds']);
    await page.getByRole('option', { name: 'total_builds' }).click();

    await expect(page.getByTestId('distribution-subtitle')).toContainText('Como os valores de total_builds');
    await expectChartDrawn(card(page, HISTOGRAM), /^Histograma de total_builds/);
    await expectChartDrawn(card(page, SCATTER), /^Dispersão de total_builds/);
    await expect(card(page, BOXPLOT).getByTestId('percentile-row')).toHaveText([/^total_builds/]);
  });
});

test.describe('@US21.03-CA3 Release, repositório, quantidade de análises e período', () => {
  test.use({ scenario: comDados });

  test('a linha abaixo dos filtros resume a release, o repositório e as análises', async ({ page }) => {
    await openDistribution(page);
    await expect(page.getByTestId('distribution-period')).toHaveText(
      'Release R2 · repositório MeasureSoftGram-Service · 8 análises no período (18 ago a 10 out)'
    );
  });
});

test.describe('@US21.03-CA4 Histograma por faixa de valor, com a régua A–E só de 0 a 1', () => {
  test.use({ scenario: comDados });

  test('de 0 a 1: faixas de 0,10 e a régua das faixas A a E', async ({ page }) => {
    await openDistribution(page);
    const histogram = card(page, HISTOGRAM);
    await expectChartDrawn(histogram, /^Histograma de TSQMI: 8 análises em faixas de 0,1\./);
    await expect(histogram).toContainText('Quantas análises caem em cada faixa de 0,10');
    // da esquerda para a direita, como o eixo: E (0 a 0,2) até A (0,8 a 1)
    await expect(histogram.getByRole('list', { name: RULER }).getByRole('listitem')).toHaveText([
      'E · Muito ruim',
      'D · Ruim',
      'C · Bom',
      'B · Muito bom',
      'A · Ótimo'
    ]);
  });

  test('nas métricas: eixo na escala da métrica, sem a régua A–E', async ({ page }) => {
    await openDistribution(page);
    await levelButton(page, 'Métrica').click();
    await choose(page, 'Métrica', 'total_builds');
    const histogram = card(page, HISTOGRAM);
    await expectChartDrawn(
      histogram,
      /^Histograma de total_builds: 8 análises em faixas de 5\. 10 a 14: 2 análises; 15 a 19: 5 análises; 40 a 44: 1 análise\./
    );
    await expect(histogram).toContainText('na escala da métrica');
    await expect(histogram.getByRole('list', { name: RULER })).toHaveCount(0);
  });

  // regressão das correções do PO (#101): barras sem espaço entre si e nomes dos eixos; a baseline é gerada no CI
  test('desenho do histograma: barras coladas, nomes dos eixos e régua (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openDistribution(page);
    const histogram = card(page, HISTOGRAM);
    await expectChartDrawn(histogram, /^Histograma de TSQMI/);
    await expect(histogram).toHaveScreenshot('histograma-tsqmi.png');

    await levelButton(page, 'Métrica').click();
    await choose(page, 'Métrica', 'total_builds');
    await expectChartDrawn(histogram, /^Histograma de total_builds/);
    await expect(histogram).toHaveScreenshot('histograma-metrica.png');
  });
});

test.describe('@US21.03-CA5 Curva de densidade no eixo do histograma, com a mediana', () => {
  test.use({ scenario: comDados });

  test('no mesmo eixo de 0 a 1, com a régua A–E e a linha da mediana', async ({ page }) => {
    await openDistribution(page);
    const density = card(page, DENSITY);
    await expectChartDrawn(density, /^Curva de densidade de TSQMI, de 0 a 1, .* Mediana \(0,58\)\./);
    await expect(density).toContainText('A linha tracejada marca a mediana');
    await expect(density.getByRole('list', { name: RULER })).toBeVisible();
  });

  test('nas métricas, sem a régua A–E', async ({ page }) => {
    await openDistribution(page);
    await levelButton(page, 'Métrica').click();
    await choose(page, 'Métrica', 'total_builds');
    const density = card(page, DENSITY);
    await expectChartDrawn(density, /^Curva de densidade de total_builds/);
    await expect(density.getByRole('list', { name: RULER })).toHaveCount(0);
  });
});

test.describe('@US21.03-CA6 Boxplot da entidade e dos filhos, com os percentis ao lado', () => {
  test.use({ scenario: comDados });

  test('no TSQMI: uma linha para o TSQMI e uma por característica, com P10 a discrepantes', async ({ page }) => {
    await openDistribution(page);
    const boxplot = card(page, BOXPLOT);
    await expectChartDrawn(boxplot, /^Boxplot de TSQMI e dos 2 filhos no modelo, de 0 a 1\./);
    await expect(boxplot.getByRole('columnheader')).toHaveText([
      'Entidade',
      'P10',
      'Q1',
      'Mediana',
      'Q3',
      'P90',
      'IQR',
      'Discrepantes'
    ]);
    const rows = boxplot.getByTestId('percentile-row');
    await expect(rows.getByRole('rowheader')).toHaveText(['TSQMI', 'Reliability', 'Maintainability']);
    await expect(rows.first()).toHaveAttribute('data-chosen', 'true');
    // QUARTIL.INC de [0,31; 0,52; 0,56; 0,57; 0,59; 0,60; 0,64; 0,90]: P10 0,457, Q1 0,55, mediana 0,58, Q3 0,61, P90 0,718
    await expect(rows.first().getByRole('cell')).toHaveText(['0,46', '0,55', '0,58', '0,61', '0,72', '0,06', '2']);
  });

  test('numa característica: a característica e as subcaracterísticas dela', async ({ page }) => {
    await openDistribution(page);
    await levelButton(page, 'Característica').click();
    const rows = card(page, BOXPLOT).getByTestId('percentile-row');
    await expect(rows.getByRole('rowheader')).toHaveText(['Reliability', 'Testing Status']);
  });

  test('numa métrica, que não tem filhos, só a linha dela', async ({ page }) => {
    await openDistribution(page);
    await levelButton(page, 'Métrica').click();
    await choose(page, 'Métrica', 'total_builds');
    const boxplot = card(page, BOXPLOT);
    await expectChartDrawn(boxplot, /^Boxplot de total_builds, de 10 a 45\./);
    const rows = boxplot.getByTestId('percentile-row');
    await expect(rows.getByRole('rowheader')).toHaveText(['total_builds']);
    // QUARTIL.INC de [12; 14; 15; 15; 16; 17; 18; 41]: Q1 14,75, mediana 15,5, Q3 17,25; só o 41 passa de Q3 + 1,5 × IQR
    await expect(rows.first().getByRole('cell')).toHaveText(['13,40', '14,75', '15,50', '17,25', '24,90', '2,50', '1']);
  });
});

test.describe('@US21.03-CA7 Dispersão das análises no tempo', () => {
  test.use({ scenario: comDados });

  test('um ponto por análise, com os quartis e os discrepantes descritos, na altura do resumo', async ({ page }) => {
    await openDistribution(page);
    const scatter = card(page, SCATTER);
    await expectChartDrawn(
      scatter,
      /^Dispersão de TSQMI no tempo: 8 análises de .*Q1 0,55, mediana 0,58 e Q3 0,61\. 2 valores discrepantes: 0,31 em 18\/08\/2026, 0,90 em 10\/10\/2026\./
    );
    await expect(scatter).toContainText('A faixa clara vai do Q1 ao Q3');

    // regressão das correções do PO (#101): a dispersão fica com a mesma altura do resumo
    const [scatterBox, summaryBox] = await Promise.all([scatter.boundingBox(), card(page, SUMMARY).boundingBox()]);
    expect(scatterBox?.height).toBeGreaterThan(0);
    expect(Math.abs((scatterBox?.height ?? 0) - (summaryBox?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  // o tooltip do ECharts só aparece ao passar o mouse num ponto do canvas, cuja posição depende do desenho:
  // não há como localizá-lo de forma estável pelo DOM, então fica na verificação manual da aceitação
  test.skip('tooltip com a data e o valor ao passar o mouse no ponto (manual)', () => {});
});

test.describe('@US21.03-CA8 Resumo estatístico com duas casas, nota e assimetria', () => {
  test.use({ scenario: comDados });

  test('as estatísticas batem com QUARTIL.INC, DESVPAD.A, VAR.A e DISTORÇÃO', async ({ page }) => {
    await openDistribution(page);
    const summary = card(page, SUMMARY);
    // valores de [0,31; 0,52; 0,56; 0,57; 0,59; 0,60; 0,64; 0,90]: média 0,58625; IQR 0,61 − 0,55 = 0,06;
    // limites 0,55 − 0,09 = 0,46 e 0,61 + 0,09 = 0,70; DESVPAD.A 0,1618; VAR.A 0,0262; DISTORÇÃO 0,434
    await expect(summary.getByTestId('summary-row')).toHaveText([
      'Análises8',
      'Mínimo0,31',
      'Q1 (1º quartil)0,55',
      'Mediana0,58',
      'Q3 (3º quartil)0,61',
      'Máximo0,90',
      'IQR (Q3 − Q1)0,06',
      'Limite inferior0,46',
      'Limite superior0,70',
      'Discrepantes2',
      'Média0,59',
      'Desvio padrão0,16',
      'Variância0,03',
      'Assimetria0,43'
    ]);
    await expect(summary.getByTestId('summary-row').filter({ hasText: 'IQR' })).toHaveAttribute(
      'data-highlight',
      'true'
    );
    await expect(summary.getByTestId('summary-note')).toContainText('O IQR é a distância entre o Q3 e o Q1');
    await expect(summary.getByTestId('summary-note')).toContainText(
      'Assimetria positiva (0,43): a cauda longa fica à direita'
    );
  });

  test('exporta o resumo em CSV e todos os quadros em .zip', async ({ page }) => {
    await openDistribution(page);
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      card(page, SUMMARY).getByRole('button', { name: 'Exportar .csv' }).click()
    ]);
    expect(csv.suggestedFilename()).toMatch(/^msgram-distribuicao-resumo-\d{4}-\d{2}-\d{2}\.csv$/);
    const content = readFileSync((await csv.path()) ?? '', 'utf8');
    // o arquivo baixado começa com a marca de ordem de bytes, senão o Excel troca os acentos de "Característica"
    expect(content.startsWith('\uFEFF')).toBe(true);
    const lines = content.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    // ponto e vírgula separando as colunas e vírgula na casa decimal, que é como o Excel em português abre e soma
    expect(lines[0]).toBe('Release;Repositório;Nível;Entidade;Estatística;Valor');
    expect(lines).toContain('R2;MeasureSoftGram-Service;TSQMI;TSQMI;Desvio padrão;0,16177');
    expect(lines).toHaveLength(15);

    const [zip] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar todos (.zip)' }).click()
    ]);
    expect(zip.suggestedFilename()).toMatch(/^msgram-distribuicao-\d{4}-\d{2}-\d{2}\.zip$/);
  });
});

test.describe('@US21.03-CA9 Estados vazios, poucas análises e erro com "Tentar novamente"', () => {
  test.describe('repositório sem análise na release', () => {
    test.use({ scenario: semAnalise });

    test('mostra o estado sem análise, com o período da release e a orientação', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(
        page.getByText('O Repositório MeasureSoftGram-Action não tem análises de TSQMI na release R2')
      ).toBeVisible();
      await expect(page.getByText(/entre 17\/08 e 16\/10, o período da release/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver como configurar a coleta' })).toBeVisible();
    });
  });

  test.describe('produto sem release', () => {
    test.use({ scenario: semRelease });

    test('convida a planejar a primeira release', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      await expect(page.getByText('Este produto ainda não tem release')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Planejar release' })).toBeVisible();
    });
  });

  test.describe('menos de 3 análises', () => {
    test.use({ scenario: poucasAnalises });

    test('a densidade e a assimetria explicam a falta, e os outros quadros continuam', async ({ page }) => {
      await openDistribution(page);
      const density = card(page, DENSITY);
      await expect(density).toContainText('Poucas análises');
      await expect(density).toContainText('Faltam análises para a curva de densidade');
      await expect(density).toContainText('A curva precisa de pelo menos 3 análises, e o período tem 2 análises');
      await expect(density.getByRole('button', { name: 'Exportar .csv' })).toBeDisabled();

      const summary = card(page, SUMMARY);
      await expect(summary.getByTestId('skewness-warning')).toHaveText(
        'Faltam análises para a assimetria: ela precisa de pelo menos 3, e o período tem 2 análises.'
      );
      await expect(summary.getByTestId('summary-row').filter({ hasText: 'Assimetria' })).toHaveText('Assimetria—');

      await expectChartDrawn(card(page, HISTOGRAM), /^Histograma de TSQMI: 2 análises/);
      await expectChartDrawn(card(page, BOXPLOT), /^Boxplot de TSQMI/);
      await expectChartDrawn(card(page, SCATTER), /^Dispersão de TSQMI no tempo: 2 análises/);
    });
  });

  test.describe('erro 500 na distribuição', () => {
    test.use({ scenario: erro500 });

    test('mostra a falha com "Tentar novamente", sem detalhes técnicos', async ({ page }) => {
      await page.goto(DISTRIBUTION_PATH);
      const error = card(page, 'Falha ao carregar');
      await expect(error.getByText('Não foi possível carregar a distribuição')).toBeVisible();
      await expect(error.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
      await expect(error).not.toContainText(/500|Erro interno|Request failed/);
    });
  });
});
