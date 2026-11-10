import { readFileSync } from 'fs';
import JSZip from 'jszip';
import { Download, Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import {
  comDados,
  CORRELATION_API,
  CORRELATION_PATH,
  correlationHandler,
  erro500,
  poucasReleases,
  semAnalise,
  semProduto,
  semRelease
} from './fixtures/relacoes';

const TITLE = '6. Relações e Correlações';
const MATRIX = 'Matriz de correlação das características';
const SUB_MATRIX = 'Matriz de correlação das subcaracterísticas';
const BUBBLES = 'Matriz de bolhas das correlações';
const CSV_HEADER = 'Repositório;Nível;Linha;Coluna;Coeficiente;p-valor;Significativo;Coeficiente aplicado;Releases';

/** Os pares que o f_σ do Core calcula sobre a RD da fixture, como a descrição acessível das matrizes os mostra. */
const PAIRS =
  'Maintainability × Reliability: 0,56; Functional Suitability × Reliability: -0,18, não significativo; ' +
  'Functional Suitability × Maintainability: 0,59.';
const SUB_PAIRS =
  'Modifiability × Testing Status: -0,60; Functional Completeness × Testing Status: sem correlação; ' +
  'Functional Completeness × Modifiability: sem correlação.';

// sem idioma salvo o app abre em inglês; os critérios estão em português
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
});

/** O cartão de um quadro (section com aria-label). */
const card = (page: Page, title: string): Locator => page.getByRole('region', { name: title });
const repositorySelect = (page: Page) => page.getByRole('combobox', { name: /^Repositório/ });
const levelButton = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Nível do modelo' }).getByRole('button', { name: label, exact: true });

/** Abre a página e espera as matrizes: a linha das releases só aparece com a correlação pronta. */
async function openCorrelation(page: Page) {
  await page.goto(CORRELATION_PATH);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByTestId('correlation-info')).toBeVisible();
  await expect(page.getByTestId('correlation-grid')).not.toHaveAttribute('aria-busy', 'true');
}

/** O clique no nível às vezes não pega logo depois da carga: clica de novo até o botão ficar marcado. */
async function chooseLevel(page: Page, label: string) {
  const button = levelButton(page, label);
  await expect(async () => {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
  }).toPass();
}

/** Troca para o repositório Front e o nível subcaracterística, e espera as matrizes da nova escolha. */
async function chooseFrontSubcharacteristic(page: Page) {
  await repositorySelect(page).click();
  await page.getByRole('option', { name: 'MeasureSoftGram-Front', exact: true }).click();
  await expect(repositorySelect(page)).toHaveText('MeasureSoftGram-Front');
  await chooseLevel(page, 'Subcaracterística');
  await expect(card(page, SUB_MATRIX)).toBeVisible();
  await expect(page.getByTestId('correlation-grid')).not.toHaveAttribute('aria-busy', 'true');
}

/** O ECharts só desenha em canvas: a descrição para leitor de tela (aria-label) e o tempo de desenho são o DOM. */
async function expectChartDrawn(chart: Locator, description: string) {
  await expect(chart.getByTestId('distribution-chart')).toHaveAttribute('data-render-ms', /^\d+$/);
  await expect(chart.getByLabel(description, { exact: true })).toBeAttached();
}

/** Linhas de um CSV exportado, sem a marca de ordem de bytes. */
function csvLines(content: string): string[] {
  return content
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
}

async function downloadedText(download: Download): Promise<string> {
  return readFileSync((await download.path()) ?? '', 'utf8');
}

async function exportCard(page: Page, title: string): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    card(page, title).getByRole('button', { name: 'Exportar .csv' }).click()
  ]);
  return download;
}

test.describe('@US21.04-CA1 Item "6. Relações e Correlações" no submenu Dashboards e a frase da página', () => {
  test.use({ scenario: comDados });

  test('aparece com um produto selecionado e leva à página com a frase do repositório', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await page.getByText('Dashboards', { exact: true }).click();
    await page.getByText(TITLE, { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/relacoes\/?$/);
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    await expect(page.getByTestId('correlation-subtitle')).toHaveText(
      'Como as características de MeasureSoftGram-Service variam juntas ao longo das releases'
    );
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

test.describe('@US21.04-CA2 Escolha do repositório e do nível, que atualiza os dois gráficos', () => {
  test.use({ scenario: comDados });

  test('abre no primeiro repositório e no nível característica', async ({ page }) => {
    await openCorrelation(page);
    await expect(repositorySelect(page)).toHaveText('MeasureSoftGram-Service');
    await expect(levelButton(page, 'Característica')).toHaveAttribute('aria-pressed', 'true');
    await expect(levelButton(page, 'Subcaracterística')).toHaveAttribute('aria-pressed', 'false');

    await repositorySelect(page).click();
    await expect(page.getByRole('option')).toHaveText(['MeasureSoftGram-Service', 'MeasureSoftGram-Front']);
  });

  test('a troca de repositório e de nível atualiza a frase, a linha das releases e as duas matrizes', async ({
    page
  }) => {
    await openCorrelation(page);
    await chooseFrontSubcharacteristic(page);

    await expect(page.getByTestId('correlation-subtitle')).toHaveText(
      'Como as subcaracterísticas de MeasureSoftGram-Front variam juntas ao longo das releases'
    );
    await expect(page.getByTestId('correlation-info')).toHaveText(
      '20 releases de MeasureSoftGram-Front · 3 subcaracterísticas · coeficiente aplicado: Spearman ' +
        '(distribuição não normal em 2 de 3 subcaracterísticas: Testing Status e Functional Completeness) · ' +
        '2 releases deixadas de fora por falta de valor'
    );
    await expect(card(page, MATRIX)).toHaveCount(0);
    await expectChartDrawn(
      card(page, SUB_MATRIX),
      `Matriz de correlação de Spearman entre 3 subcaracterísticas de MeasureSoftGram-Front em 20 releases. ${SUB_PAIRS}`
    );
    await expectChartDrawn(
      card(page, BUBBLES),
      `Matriz de bolhas de Spearman entre 3 subcaracterísticas de MeasureSoftGram-Front em 20 releases. ${SUB_PAIRS}`
    );
  });
});

test.describe('@US21.04-CA3 Releases usadas, entidades, coeficiente, colunas não normais e releases de fora', () => {
  test.use({ scenario: comDados });

  test('a linha abaixo dos filtros resume a RD usada na correlação', async ({ page }) => {
    await openCorrelation(page);
    await expect(page.getByTestId('correlation-info')).toHaveText(
      '20 releases de MeasureSoftGram-Service · 3 características · coeficiente aplicado: Spearman ' +
        '(distribuição não normal em 3 de 3 características: Reliability, Maintainability e Functional Suitability) · ' +
        '2 releases deixadas de fora por falta de valor'
    );
  });

  test('"Ver releases da análise" mostra cada release com o valor das características e se entrou na RD', async ({
    page
  }) => {
    await openCorrelation(page);
    await page.getByRole('button', { name: 'Ver releases da análise' }).click();
    const table = page.getByRole('table', { name: 'Releases da análise de MeasureSoftGram-Service' });
    const row = (index: number) => table.getByRole('row').nth(index).getByRole('cell');
    await expect(table.getByRole('row')).toHaveCount(23);
    await expect(row(1)).toHaveText([
      'R1',
      '5 jan a 18 jan',
      '—',
      '—',
      '—',
      'Fora: sem valor de Reliability, Maintainability e Functional Suitability'
    ]);
    await expect(row(2)).toHaveText([
      'R2',
      '19 jan a 1 fev',
      '0,60',
      '0,60',
      '—',
      'Fora: sem valor de Functional Suitability'
    ]);
    await expect(row(3)).toHaveText(['R3', '2 fev a 15 fev', '0,63', '0,63', '0,65', 'Usada']);
    await expect(table.getByRole('cell', { name: 'Usada', exact: true })).toHaveCount(20);
  });
});

test.describe('@US21.04-CA4 Matriz de correlação: triângulo de baixo, duas casas, escala divergente e notas', () => {
  test.use({ scenario: comDados });

  test('cada par com o coeficiente em duas casas, o não significativo marcado, a legenda e as notas', async ({
    page
  }) => {
    await openCorrelation(page);
    const matrix = card(page, MATRIX);
    await expectChartDrawn(
      matrix,
      `Matriz de correlação de Spearman entre 3 características de MeasureSoftGram-Service em 20 releases. ${PAIRS}`
    );
    await expect(matrix).toContainText('nas 20 releases de MeasureSoftGram-Service');
    await expect(matrix.getByText('−1', { exact: true })).toBeVisible();
    await expect(matrix.getByText('+1', { exact: true })).toBeVisible();
    await expect(matrix.getByText('Azul: movem-se juntas · Laranja: movem-se em sentidos opostos')).toBeVisible();
    await expect(
      matrix.getByText('Itálico e opaco: não significativo (|r| < 0,44, p < 0,05, n = 20)', { exact: true })
    ).toBeVisible();
    await expect(
      matrix.getByText(
        'Coeficiente aplicado: Spearman. Regra do modelo: Pearson se a distribuição de RD for normal, Spearman caso contrário.',
        { exact: true }
      )
    ).toBeVisible();
  });

  // o triângulo de baixo, os nomes na diagonal, as cores da escala e o itálico só existem no canvas
  test('desenho da matriz: triângulo de baixo, diagonal, cores e itálico (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openCorrelation(page);
    const matrix = card(page, MATRIX);
    await expect(matrix.getByTestId('distribution-chart')).toHaveAttribute('data-render-ms', /^\d+$/);
    await expect(matrix).toHaveScreenshot('matriz-correlacao.png');
  });
});

test.describe('@US21.04-CA5 Matriz de bolhas: tamanho |r|, cor pelo sinal e círculo vazado', () => {
  test.use({ scenario: comDados });

  test('a mesma RD_Corr, com a legenda das cores e dos tamanhos', async ({ page }) => {
    await openCorrelation(page);
    const bubbles = card(page, BUBBLES);
    await expectChartDrawn(
      bubbles,
      `Matriz de bolhas de Spearman entre 3 características de MeasureSoftGram-Service em 20 releases. ${PAIRS}`
    );
    await expect(bubbles.getByRole('listitem')).toHaveText(['Positiva', 'Negativa', 'Não tem relação']);
    await expect(bubbles.getByText('Tamanho = |r|:', { exact: true })).toBeVisible();
    await Promise.all(
      ['0,25', '0,50', '0,75', '1,00'].map((size) => expect(bubbles.getByText(size, { exact: true })).toBeVisible())
    );
  });

  // o tamanho do círculo, a cor pelo sinal e o círculo vazado só existem no canvas
  test('desenho das bolhas: tamanho, cor e círculo vazado (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openCorrelation(page);
    const bubbles = card(page, BUBBLES);
    await expect(bubbles.getByTestId('distribution-chart')).toHaveAttribute('data-render-ms', /^\d+$/);
    await expect(bubbles).toHaveScreenshot('matriz-bolhas.png');
  });
});

test.describe('@US21.04-CA6 Ao passar o mouse numa célula, o par e o coeficiente', () => {
  // o tooltip do ECharts só aparece ao passar o mouse numa célula do canvas, cuja posição depende do desenho:
  // não há como localizá-la de forma estável pelo DOM, então fica na verificação manual da aceitação
  test.skip('tooltip "Maintainability × Reliability: Spearman = 0,56" nas duas matrizes (manual)', async () => {});
});

test.describe('@US21.04-CA7 "Exportar .csv" por matriz e .zip no topo, seguindo os filtros', () => {
  test.use({ scenario: comDados });

  test('o CSV da matriz traz os pares, os coeficientes e p-valores sem arredondar e a significância', async ({
    page
  }) => {
    await openCorrelation(page);
    const download = await exportCard(page, MATRIX);
    expect(download.suggestedFilename()).toMatch(/^msgram-relacoes-matriz-correlacao-\d{4}-\d{2}-\d{2}\.csv$/);
    const content = await downloadedText(download);
    // o arquivo baixado começa com a marca de ordem de bytes, senão o Excel troca os acentos de "Característica"
    expect(content.startsWith('\uFEFF')).toBe(true);
    // os valores são os da RD_Corr do Service, sem o arredondamento da tela
    expect(csvLines(content)).toEqual([
      CSV_HEADER,
      'MeasureSoftGram-Service;Característica;Maintainability;Reliability;0,5589743589743589;0,010403772956762005;sim;Spearman;20',
      'MeasureSoftGram-Service;Característica;Functional Suitability;Reliability;-0,18232322463624387;0,44168225692108976;não;Spearman;20',
      'MeasureSoftGram-Service;Característica;Functional Suitability;Maintainability;0,591169243517518;0,006049590958040661;sim;Spearman;20'
    ]);
  });

  test('depois de trocar o repositório e o nível, o CSV das bolhas e o .zip seguem a nova escolha', async ({
    page
  }) => {
    await openCorrelation(page);
    await chooseFrontSubcharacteristic(page);

    const subRows = [
      CSV_HEADER,
      'MeasureSoftGram-Front;Subcaracterística;Modifiability;Testing Status;-0,5996293009040392;0,005197857100976576;sim;Spearman;20',
      'MeasureSoftGram-Front;Subcaracterística;Functional Completeness;Testing Status;;;não;Spearman;20',
      'MeasureSoftGram-Front;Subcaracterística;Functional Completeness;Modifiability;;;não;Spearman;20'
    ];
    const bubbles = await exportCard(page, BUBBLES);
    expect(bubbles.suggestedFilename()).toMatch(/^msgram-relacoes-matriz-bolhas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csvLines(await downloadedText(bubbles))).toEqual(subRows);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar todos (.zip)' }).click()
    ]);
    const date = /^msgram-relacoes-(\d{4}-\d{2}-\d{2})\.zip$/.exec(download.suggestedFilename())?.[1];
    expect(date).toBeTruthy();
    const zip = await JSZip.loadAsync(readFileSync((await download.path()) ?? ''));
    const names = [`msgram-relacoes-matriz-correlacao-${date}.csv`, `msgram-relacoes-matriz-bolhas-${date}.csv`];
    const rd = `msgram-relacoes-dados-rd-${date}.csv`;
    expect(Object.keys(zip.files).sort()).toEqual([...names, rd].sort());
    const files = await Promise.all(names.map((name) => zip.file(name)?.async('string') ?? ''));
    files.forEach((content) => expect(csvLines(content)).toEqual(subRows));
    // a RD vai sem arredondar, uma linha por release, para recalcular os coeficientes
    const rdLines = csvLines((await zip.file(rd)?.async('string')) ?? '');
    expect(rdLines).toHaveLength(23);
    expect(rdLines.slice(0, 4)).toEqual([
      'Release;Início;Fim;Testing Status;Modifiability;Functional Completeness;Situação',
      'R1;05/01/2026;18/01/2026;;;;Fora: sem valor de Testing Status, Modifiability e Functional Completeness',
      'R2;19/01/2026;01/02/2026;0,6;;0,8;Fora: sem valor de Modifiability',
      'R3;02/02/2026;15/02/2026;0,63;0,59;0,8;Usada'
    ]);
  });
});

test.describe('@US21.04-CA9 Poucas releases, entidade sem variação, estados vazios e erro com "Tentar novamente"', () => {
  test.describe('menos de 3 releases com valor', () => {
    test.use({ scenario: poucasReleases });

    test('explica que faltam releases, sem as matrizes', async ({ page }) => {
      await page.goto(CORRELATION_PATH);
      await expect(page.getByText('Faltam releases para calcular a correlação')).toBeVisible();
      await expect(
        page.getByText(
          'A correlação precisa de pelo menos 3 releases com valor para todas as características, e o repositório ' +
            'MeasureSoftGram-Service tem 2 releases.'
        )
      ).toBeVisible();
      await expect(page.getByTestId('correlation-info')).toHaveCount(0);
      await expect(page.getByTestId('distribution-chart')).toHaveCount(0);
    });
  });

  test.describe('entidade com o mesmo valor em todas as releases', () => {
    test.use({ scenario: comDados });

    test('os pares dela ficam sem correlação, na matriz e no CSV', async ({ page }) => {
      await openCorrelation(page);
      await chooseFrontSubcharacteristic(page);
      // o "—" da célula é desenhado no canvas; no DOM ele aparece como "sem correlação" na descrição acessível
      await expectChartDrawn(
        card(page, SUB_MATRIX),
        `Matriz de correlação de Spearman entre 3 subcaracterísticas de MeasureSoftGram-Front em 20 releases. ${SUB_PAIRS}`
      );
      const lines = csvLines(await downloadedText(await exportCard(page, SUB_MATRIX)));
      expect(lines).toContain(
        'MeasureSoftGram-Front;Subcaracterística;Functional Completeness;Testing Status;;;não;Spearman;20'
      );
    });

    // o tooltip só aparece ao passar o mouse na célula do canvas: fica na verificação manual da aceitação
    test.skip('o "—" na célula e o tooltip explicando que o valor não variou (manual)', async () => {});
  });

  test.describe('repositório sem análise', () => {
    test.use({ scenario: semAnalise });

    test('mostra o estado sem análise, com a orientação da coleta', async ({ page }) => {
      await page.goto(CORRELATION_PATH);
      await expect(
        page.getByText('O repositório MeasureSoftGram-Service não tem análises nas releases do produto')
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ver como configurar a coleta' })).toBeVisible();
    });
  });

  test.describe('produto sem release', () => {
    test.use({ scenario: semRelease });

    test('convida a planejar a primeira release', async ({ page }) => {
      await page.goto(CORRELATION_PATH);
      await expect(page.getByText('Este produto ainda não tem release')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Planejar release' })).toBeVisible();
    });
  });

  test.describe('erro 500 na correlação', () => {
    test.use({ scenario: erro500 });

    test('mostra a falha sem detalhes técnicos, e "Tentar novamente" carrega as matrizes', async ({ page, api }) => {
      await page.goto(CORRELATION_PATH);
      const error = card(page, 'Falha ao carregar');
      await expect(error.getByText('Não foi possível carregar as correlações')).toBeVisible();
      await expect(error).not.toContainText(/500|Erro interno|Request failed/);

      api.set(CORRELATION_API.correlation, correlationHandler);
      await error.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByTestId('correlation-info')).toBeVisible();
      await expectChartDrawn(
        card(page, MATRIX),
        `Matriz de correlação de Spearman entre 3 características de MeasureSoftGram-Service em 20 releases. ${PAIRS}`
      );
    });
  });
});
