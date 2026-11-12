import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { ApiHandlers } from './support/api';
import { bandSwatch, card, downloadCsv } from './support/helpers';
import * as produto from './fixtures/produto';
import * as overview from './fixtures/overview';
import * as distribuicao from './fixtures/distribuicao';
import * as entidade from './fixtures/entidade';
import * as repositorio from './fixtures/repositorio';
import releaseRepositories from './fixtures/distribuicao/release-repositories.json';
import { faixaA085, faixasIndisponiveis, QUALITY_BANDS_API, reguaA085 } from './fixtures/faixas';

/** A cor da faixa B (Muito bom) no guia de IDV: com a faixa A a partir de 0,85, é a de um indicador de 0,82. */
const B_COLOR = 'rgb(13, 200, 137)';
const A_COLOR = 'rgb(4, 114, 77)';
/** Os rótulos da legenda das faixas, com o intervalo, da pior para a melhor (como no pulso). */
const LEGEND_A085 = [
  'E · Muito ruim (0,00 a 0,19)',
  'D · Ruim (0,20 a 0,39)',
  'C · Bom (0,40 a 0,59)',
  'B · Muito bom (0,60 a 0,84)',
  'A · Ótimo (0,85 a 1,00)'
];
const LEGEND_DEFAULT_A = 'A · Ótimo (0,80 a 1,00)';

const UNAVAILABLE = 'Não foi possível carregar as faixas do produto';
const UNAVAILABLE_DESCRIPTION = 'Os gráficos estão sendo exibidos com as faixas padrão.';

const OVERVIEW_INDICATOR = 'Indicador Total da Qualidade';
const REPOSITORY_PULSE = 'Indicador das Características';

/** O aviso discreto do guia de IDV (role=status) de faixas indisponíveis. */
const unavailableWarning = (page: Page) => page.getByRole('status').filter({ hasText: UNAVAILABLE });

/** Na Visão Geral de Qualidade, o Service da R2 passa a ter 0,82: o exemplo dos critérios. */
const characteristicsOf = overview.comDados[overview.OVERVIEW_API.characteristics];
const overviewCom082: ApiHandlers = {
  ...overview.comDados,
  [overview.OVERVIEW_API.characteristics]: (url: URL) =>
    url.searchParams.get('release_id') === '2'
      ? {
          ...releaseRepositories,
          repositories: releaseRepositories.repositories.map((repository) =>
            repository.name === 'MeasureSoftGram-Service'
              ? { ...repository, tsqmi: { ...repository.tsqmi, value: 0.82 } }
              : repository
          )
        }
      : typeof characteristicsOf === 'function' && characteristicsOf(url)
};

// ---------------------------------------------------------------- aberturas das telas

/** A Visão Geral do produto, com o pulso: o rodapé só aparece com os dois históricos carregados. */
async function openProductPulse(page: Page) {
  await page.goto(produto.PRODUTO_PATH);
  await expect(page.getByText(/ medições? no período selecionado/)).toBeVisible();
}

const productPulseCsv = (page: Page) =>
  downloadCsv(
    page,
    page.getByRole('button', { name: 'Exportar .csv' }),
    /^msgram-produto-pulso-\d{4}-\d{2}-\d{2}\.csv$/
  );

async function openOverview(page: Page) {
  await page.goto(overview.OVERVIEW_PATH);
  await expect(page.getByRole('heading', { level: 1, name: '1. Visão Geral de Qualidade' })).toBeVisible();
  await expect(
    card(page, OVERVIEW_INDICATOR).getByRole('button', { name: 'Exportar .csv', exact: true })
  ).toBeEnabled();
}

const overviewCsv = (page: Page) =>
  downloadCsv(
    page,
    card(page, OVERVIEW_INDICATOR).getByRole('button', { name: 'Exportar .csv', exact: true }),
    /^msgram-overview-indicador-\d{4}-\d{2}-\d{2}\.csv$/
  );

async function openDistribution(page: Page) {
  await page.goto(distribuicao.DISTRIBUTION_PATH);
  await expect(page.getByRole('heading', { level: 1, name: '5. Distribuição Estatística' })).toBeVisible();
  await expect(page.getByTestId('distribution-grid')).not.toHaveAttribute('aria-busy', 'true');
}

async function openEntity(page: Page) {
  await page.goto(entidade.ENTITY_PATH);
  await expect(page.getByRole('heading', { level: 1, name: '4. Análise por Entidade' })).toBeVisible();
  await expect(page.getByTestId('entity-heatmap')).toHaveAttribute('data-render-ms', /^\d+$/);
}

async function openRepository(page: Page) {
  await page.goto(repositorio.REPOSITORY_PATH);
  await expect(page.getByRole('heading', { name: 'MeasureSoftGram-Service' })).toBeVisible();
  await expect(card(page, REPOSITORY_PULSE).getByRole('button', { name: 'Exportar .csv', exact: true })).toBeEnabled();
}

const repositoryPulseCsv = (page: Page) =>
  downloadCsv(
    page,
    card(page, REPOSITORY_PULSE).getByRole('button', { name: 'Exportar .csv', exact: true }),
    /^msgram-repositorio-pulso-\d{4}-\d{2}-\d{2}\.csv$/
  );

/** A largura de cada faixa da régua do histograma, de E para A. */
async function rulerWidths(histogram: Locator): Promise<number[]> {
  const items = histogram.getByRole('list', { name: 'Faixas de qualidade de A a E' }).getByRole('listitem');
  await expect(items).toHaveCount(5);
  const boxes = await Promise.all((await items.all()).map((item) => item.boundingBox()));
  return boxes.map((box) => box!.width);
}

// ---------------------------------------------------------------- critérios

test.describe('@US30.02-CA1 Os gráficos usam as faixas do produto nas cores, nos nomes e nas legendas', () => {
  test.describe('pulso do produto', () => {
    test.use({ scenario: { ...produto.comDados, ...faixaA085 } });

    test('a legenda mostra "0,85 a 1,00" na faixa A, e o 0,84 do Service fica em B', async ({ page }) => {
      await openProductPulse(page);
      await Promise.all(LEGEND_A085.map((label) => expect(page.getByText(label, { exact: true })).toBeVisible()));
      await expect(bandSwatch(page, 'B · Muito bom (0,60 a 0,84)')).toHaveCSS('background-color', B_COLOR);
      await expect(page.getByRole('heading', { level: 6, name: '0.840' })).toHaveCSS('color', B_COLOR);
      await expect(page.getByTitle(/^último indicador TSQMI/)).toHaveText([
        'último indicador TSQMI · muito bom',
        'último indicador TSQMI · bom'
      ]);
    });
  });

  test.describe('Visão Geral de Qualidade', () => {
    test.use({ scenario: { ...overviewCom082, ...faixaA085 } });

    test('a legenda das faixas usa os limites do produto', async ({ page }) => {
      await openOverview(page);
      await expect(card(page, OVERVIEW_INDICATOR).getByTestId('quality-bands-legend').locator('p')).toHaveText([
        'Faixas',
        ...[...LEGEND_A085].reverse()
      ]);
    });
  });

  test.describe('Distribuição Estatística', () => {
    test.use({ scenario: { ...distribuicao.comDados, ...faixaA085 } });

    test('a régua do histograma acompanha os limites do produto: a faixa A vale 0,15 do eixo', async ({ page }) => {
      await openDistribution(page);
      const histogram = card(page, 'Histograma');
      await expect(histogram.getByTestId('distribution-chart')).toHaveAttribute('data-render-ms', /^\d+$/);
      // E, D e C valem 0,20 do eixo; B, 0,25 (de 0,60 a 0,85); A, 0,15
      await expect(async () => {
        const [e, d, c, b, a] = await rulerWidths(histogram);
        expect(d / e).toBeCloseTo(1, 1);
        expect(c / e).toBeCloseTo(1, 1);
        expect(b / e).toBeCloseTo(1.25, 1);
        expect(a / e).toBeCloseTo(0.75, 1);
      }).toPass();
    });
  });

  test.describe('Análise por Entidade', () => {
    test.use({ scenario: { ...entidade.comDados, ...faixaA085 } });

    test('o 0,81 do Service em Test Coverage fica em B, e a legenda mostra a faixa A a partir de 0,85', async ({
      page
    }) => {
      await openEntity(page);
      const cell = page
        .getByRole('table', { name: 'Mapa de calor' })
        .getByRole('button', { name: 'MeasureSoftGram-Service · Test Coverage: 0,81 (B, Muito bom)' });
      await expect(cell).toHaveText('0,81B');
      await expect(cell).toHaveCSS('background-color', B_COLOR);
      // o 0,91 continua em A
      await expect(
        page.getByRole('button', { name: 'MeasureSoftGram-Front · Passed Tests: 0,91 (A, Ótimo)' })
      ).toHaveCSS('background-color', A_COLOR);
      const legend = page.getByTestId('quality-grade-legend');
      await expect(legend).toContainText('A[0,85; 1,00] Ótimo');
      await expect(legend).toContainText('B[0,60; 0,85) Muito bom');
    });
  });

  test.describe('pulso do repositório', () => {
    test.use({ scenario: { ...repositorio.comDados, ...faixaA085 } });

    test('a legenda do pulso das características usa os limites do produto', async ({ page }) => {
      await openRepository(page);
      await expect(card(page, REPOSITORY_PULSE).getByText(/^[A-E] · /)).toHaveText(LEGEND_A085);
      await expect(bandSwatch(card(page, REPOSITORY_PULSE), 'A · Ótimo (0,85 a 1,00)')).toHaveCSS(
        'background-color',
        A_COLOR
      );
    });
  });
});

test.describe('@US30.02-CA2 Depois de alterar as faixas, o dashboard aberto ou recarregado já usa os novos limites', () => {
  test.use({ scenario: produto.comDados });

  test('salvar nas configurações muda a régua do pulso, sem recalcular os indicadores', async ({ page, api }) => {
    await openProductPulse(page);
    await expect(page.getByText(LEGEND_DEFAULT_A, { exact: true })).toBeVisible();

    await page.getByText('Configurações', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Até da faixa B · Muito bom' }).fill('0,85');
    api.set(QUALITY_BANDS_API, reguaA085);
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Faixas salvas')).toBeVisible();

    // de volta ao dashboard já aberto, sem recarregar: a régua vem do mesmo cache das configurações
    await page.goBack();
    await expect(page.getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
    // os valores são os mesmos; só a faixa de 0,82 e de 0,84 muda de A para B
    const csv = await productPulseCsv(page);
    expect(csv).toContain('MeasureSoftGram-Service;2026-09-01T12:00:00Z;0,82;B');
    expect(csv).toContain('MeasureSoftGram-Service;2026-10-10T12:00:00Z;0,84;B');

    await page.reload();
    await expect(page.getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
  });
});

test.describe('@US30.02-CA3 O CSV do pulso e da Visão Geral traz a faixa segundo os limites do produto', () => {
  test.describe('pulso do produto', () => {
    test.use({ scenario: { ...produto.comDados, ...faixaA085 } });

    test('0,82 e 0,84 saem com o grau B', async ({ page }) => {
      await openProductPulse(page);
      await expect(page.getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
      expect(await productPulseCsv(page)).toEqual([
        'Repositório;Data;Valor;Grau',
        'MeasureSoftGram-Service;2026-07-01T12:00:00Z;0,62;B',
        'MeasureSoftGram-Service;2026-07-25T12:00:00Z;0,7;B',
        'MeasureSoftGram-Service;2026-08-10T12:00:00Z;0,78;B',
        'MeasureSoftGram-Service;2026-09-01T12:00:00Z;0,82;B',
        'MeasureSoftGram-Service;2026-09-20T12:00:00Z;0,76;B',
        'MeasureSoftGram-Service;2026-10-10T12:00:00Z;0,84;B',
        'MeasureSoftGram-Front;2026-07-05T12:00:00Z;0,58;C',
        'MeasureSoftGram-Front;2026-08-12T12:00:00Z;0,52;C',
        'MeasureSoftGram-Front;2026-09-10T12:00:00Z;0,47;C',
        'MeasureSoftGram-Front;2026-10-05T12:00:00Z;0,44;C'
      ]);
    });
  });

  test.describe('Visão Geral de Qualidade', () => {
    test.use({ scenario: { ...overviewCom082, ...faixaA085 } });

    test('o indicador de 0,82 sai com o grau B', async ({ page }) => {
      await openOverview(page);
      await expect(page.getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
      expect(await overviewCsv(page)).toEqual([
        'Release;Repositório;Indicador;Grau',
        'R2;MeasureSoftGram-Service;0,82;B',
        'R2;MeasureSoftGram-Front;0,58;C'
      ]);
    });
  });

  test.describe('pulso do repositório', () => {
    test.use({ scenario: { ...repositorio.comDados, ...faixaA085 } });

    test('o 0,82 de Maintainability sai com o grau B', async ({ page }) => {
      await openRepository(page);
      await expect(card(page, REPOSITORY_PULSE).getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
      expect(await repositoryPulseCsv(page)).toContain(
        'MeasureSoftGram-Service;Maintainability;2026-08-20T12:00:00-03:00;0,82;B'
      );
    });
  });
});

test.describe('@US30.02-CA4 Sem as faixas do produto, a régua padrão e um aviso discreto', () => {
  test.describe('pulso do produto', () => {
    test.use({ scenario: { ...produto.comDados, ...faixasIndisponiveis } });

    test('o aviso aparece, o pulso fica com a régua padrão e "Tentar novamente" carrega as faixas', async ({
      page,
      api
    }) => {
      await openProductPulse(page);
      const warning = unavailableWarning(page);
      await expect(warning).toHaveAttribute('data-severity', 'warning');
      await expect(warning).toContainText(UNAVAILABLE_DESCRIPTION);
      await expect(warning).not.toContainText(/500|Erro interno|Request failed/);
      // os dados continuam legíveis, com a régua padrão
      await expect(page.getByText(LEGEND_DEFAULT_A, { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 6, name: '0.840' })).toHaveCSS('color', A_COLOR);

      api.set(QUALITY_BANDS_API, reguaA085);
      await warning.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(warning).toBeHidden();
      await expect(page.getByText('A · Ótimo (0,85 a 1,00)', { exact: true })).toBeVisible();
    });
  });

  const pages: [string, ApiHandlers, typeof openOverview][] = [
    ['Visão Geral de Qualidade', overview.comDados, openOverview],
    ['Distribuição Estatística', distribuicao.comDados, openDistribution],
    ['Análise por Entidade', entidade.comDados, openEntity],
    ['tela do repositório', repositorio.comDados, openRepository]
  ];
  pages.forEach(([name, scenario, open]) => {
    test.describe(name, () => {
      test.use({ scenario: { ...scenario, ...faixasIndisponiveis } });

      test('mostra o aviso, sem impedir a leitura dos dados', async ({ page }) => {
        // cada abertura já espera os dados da tela na tela
        await open(page);
        await expect(unavailableWarning(page)).toContainText(UNAVAILABLE_DESCRIPTION);
      });
    });
  });
});
