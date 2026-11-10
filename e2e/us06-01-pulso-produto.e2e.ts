import { Page } from '@playwright/test';
import { MockApi } from './support/api';
import { expect, test } from './support/fixtures';
import { bandSwatch, downloadCsv, loadFont } from './support/helpers';
import { RELEASES_API, releases } from './fixtures/common';
import {
  comDados,
  PRODUTO_API,
  PRODUTO_PATH,
  releaseHistoryComDados,
  semReleases,
  umaTrocaDeFaixa
} from './fixtures/produto';

const TITLE = 'Visão Geral';
const NO_RELEASES = 'Este produto ainda não tem releases cadastradas';

/** O resumo abaixo do pulso: "N repositórios • M medições no período selecionado • K Releases no período • …". */
const footer = (page: Page) => page.getByText(/ medições? no período selecionado/);
/**
 * O pulso é um canvas só (ECharts); o nome, o último indicador e a variação de cada faixa ficam no DOM, por cima.
 * shortcut: sem escopo, porque o quadro do pulso na Visão Geral não tem section com aria-label em src/ (o do repositório
 * tem); o openPulse confere que a página tem um canvas só. Troque por um card quando o quadro ganhar um.
 */
const chart = (page: Page) => page.locator('canvas');
const repositoryNames = (page: Page) => page.getByTitle(/^MeasureSoftGram-/);
const repositorySelect = (page: Page) => page.getByRole('combobox', { name: 'Repositório', exact: true });
const exportButton = (page: Page) => page.getByRole('button', { name: 'Exportar .csv' });

/** Abre a Visão Geral do produto e espera o pulso montar: o rodapé só aparece com os dois históricos carregados. */
async function openPulse(page: Page) {
  await page.goto(PRODUTO_PATH);
  await expect(page.getByRole('heading', { level: 4, name: TITLE })).toBeVisible();
  await expect(footer(page)).toBeVisible();
  await expect(chart(page)).toHaveCount(1);
}

/** Abre o pulso com a fonte do canvas já carregada (ver loadFont), para o snapshot ser o mesmo a cada execução. */
async function openPulseForSnapshot(page: Page, api: MockApi) {
  const release = api.hold(PRODUTO_API.historicalValues);
  await page.goto(PRODUTO_PATH);
  await loadFont(page, 'Roboto');
  release();
  await expect(footer(page)).toBeVisible();
  await expect(chart(page)).toHaveCount(1);
}

async function chooseRepository(page: Page, option: string) {
  await repositorySelect(page).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(repositorySelect(page)).toHaveText(option);
}

test.describe('@US06.01-CA1 Um ponto por release em cada repositório, no eixo dos marcos das releases', () => {
  test.use({ scenario: comDados });

  test('o rodapé conta os repositórios, as medições e as releases do período', async ({ page }) => {
    await openPulse(page);
    await expect(footer(page)).toHaveText(
      '2 repositórios • 10 medições no período selecionado • 2 Releases no período • última medição: 10/10/2026'
    );
  });

  test('desenho do pulso com os marcadores e os pontos de R1 e R2 (snapshot)', async ({ api, page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openPulseForSnapshot(page, api);
    await expect(chart(page)).toHaveScreenshot('pulso-produto.png');
  });

  // regra do PO (27/09 e 08/10): as faixas e as cores do indicador ficam documentadas e na legenda
  test('a legenda mostra as cinco faixas do indicador, cada uma com a sua cor', async ({ page }) => {
    await openPulse(page);
    const bands = [
      ['E · Muito ruim (0,00 a 0,19)', 'rgb(190, 46, 14)'],
      ['D · Ruim (0,20 a 0,39)', 'rgb(241, 97, 65)'],
      ['C · Bom (0,40 a 0,59)', 'rgb(235, 161, 51)'],
      ['B · Muito bom (0,60 a 0,79)', 'rgb(13, 200, 137)'],
      ['A · Ótimo (0,80 a 1,00)', 'rgb(4, 114, 77)']
    ];
    await Promise.all(
      bands.map(([label, color]) => expect(bandSwatch(page, label)).toHaveCSS('background-color', color))
    );
  });

  test('o último indicador de cada repositório aparece na cor da faixa', async ({ page }) => {
    await openPulse(page);
    await expect(page.getByRole('heading', { level: 6, name: '0.840' })).toHaveCSS('color', 'rgb(4, 114, 77)');
    await expect(page.getByRole('heading', { level: 6, name: '0.440' })).toHaveCSS('color', 'rgb(235, 161, 51)');
    await expect(page.getByTitle(/^último indicador TSQMI/)).toHaveText([
      'último indicador TSQMI · ótimo',
      'último indicador TSQMI · bom'
    ]);
  });

  test('"Exportar .csv" baixa as medições de cada repositório, com o grau de cada uma', async ({ page }) => {
    await openPulse(page);
    expect(await downloadCsv(page, exportButton(page), /^msgram-produto-pulso-\d{4}-\d{2}-\d{2}\.csv$/)).toEqual([
      'Repositório;Data;Valor;Grau',
      'MeasureSoftGram-Service;2026-07-01T12:00:00Z;0,62;B',
      'MeasureSoftGram-Service;2026-07-25T12:00:00Z;0,7;B',
      'MeasureSoftGram-Service;2026-08-10T12:00:00Z;0,78;B',
      'MeasureSoftGram-Service;2026-09-01T12:00:00Z;0,82;A',
      'MeasureSoftGram-Service;2026-09-20T12:00:00Z;0,76;B',
      'MeasureSoftGram-Service;2026-10-10T12:00:00Z;0,84;A',
      'MeasureSoftGram-Front;2026-07-05T12:00:00Z;0,58;C',
      'MeasureSoftGram-Front;2026-08-12T12:00:00Z;0,52;C',
      'MeasureSoftGram-Front;2026-09-10T12:00:00Z;0,47;C',
      'MeasureSoftGram-Front;2026-10-05T12:00:00Z;0,44;C'
    ]);
  });

  // protótipo aprovado pelo PO em 14/10, num quadro de 1440 px: o "Exportar .csv" logo ao lado dos campos De/Até
  test('"Exportar .csv" fica na mesma linha, logo depois do filtro De/Até', async ({ page }) => {
    // com 1280 px a barra de filtros não cabe numa linha e o botão desce para a linha de baixo
    await page.setViewportSize({ width: 1440, height: 1024 });
    await openPulse(page);
    const [until, button] = await Promise.all([
      page.getByLabel('Até', { exact: true }).boundingBox(),
      exportButton(page).boundingBox()
    ]);
    expect(button!.x).toBeGreaterThan(until!.x + until!.width);
    expect(Math.abs(button!.y + button!.height / 2 - (until!.y + until!.height / 2))).toBeLessThan(2);
  });

  // pedido do PO em 08/10: "mantenha o componente de filtro abaixo dos gráficos"
  test.fixme(
    'o filtro de período (De/Até) fica abaixo do gráfico (bug: o filtro fica acima do gráfico)',
    async ({ page }) => {
      await openPulse(page);
      const [from, canvas] = await Promise.all([
        page.getByLabel('De', { exact: true }).boundingBox(),
        chart(page).boundingBox()
      ]);
      expect(from!.y).toBeGreaterThan(canvas!.y + canvas!.height);
    }
  );

  test.describe('indicador que muda de faixa uma vez só', () => {
    test.use({ scenario: umaTrocaDeFaixa });

    test.fixme(
      'o gráfico aparece quando o indicador de um repositório muda de faixa uma única vez (bug: a página quebra com "Application error")',
      async ({ page }) => {
        await openPulse(page);
        await expect(footer(page)).toHaveText(
          '2 repositórios • 9 medições no período selecionado • 2 Releases no período • última medição: 10/10/2026'
        );
      }
    );
  });
});

test.describe('@US06.01-CA2 Um único valor por release, sem um ponto por commit ou PR', () => {
  test.use({ scenario: comDados });

  // o CSV exporta as medições, não os pontos das releases: só o desenho mostra um ponto por release
  test('seis medições do Service e um ponto em cada uma das duas releases (snapshot)', async ({ api, page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openPulseForSnapshot(page, api);
    await chooseRepository(page, 'MeasureSoftGram-Service');
    await expect(footer(page)).toContainText('1 repositório • 6 medições no período selecionado • 2 Releases');
    await expect(chart(page)).toHaveScreenshot('pulso-um-repositorio.png');
  });
});

test.describe('@US06.01-CA3 Uma série por repositório sobre o mesmo eixo de releases', () => {
  test.use({ scenario: comDados });

  test('uma faixa por repositório, com o nome, o último indicador e a variação desde R1', async ({ page }) => {
    await openPulse(page);
    await expect(repositoryNames(page)).toHaveText(['MeasureSoftGram-Service', 'MeasureSoftGram-Front']);
    await expect(page.getByRole('heading', { level: 6, name: /^\d\.\d{3}$/ })).toHaveText(['0.840', '0.440']);
    await expect(page.getByTitle(/vs\. R1$/)).toHaveText(['▲ 7,69% vs. R1', '▼ 15,38% vs. R1']);
  });

  // pedido do PO em 27/09: a opção "Todos" no combobox de repositórios
  test('o seletor tem "Todos" e um item por repositório', async ({ page }) => {
    await openPulse(page);
    await expect(repositorySelect(page)).toHaveText('Todos (2)');
    await repositorySelect(page).click();
    await expect(page.getByRole('option')).toHaveText([
      'Todos (2)',
      'MeasureSoftGram-Service',
      'MeasureSoftGram-Front'
    ]);
  });

  test('ao escolher um repositório, só a série dele; "Todos" volta às duas', async ({ page }) => {
    await openPulse(page);
    await chooseRepository(page, 'MeasureSoftGram-Front');
    await expect(repositoryNames(page)).toHaveText(['MeasureSoftGram-Front']);
    await expect(footer(page)).toContainText('1 repositório • 4 medições no período selecionado • 2 Releases');

    await chooseRepository(page, 'Todos (2)');
    await expect(repositoryNames(page)).toHaveText(['MeasureSoftGram-Service', 'MeasureSoftGram-Front']);
    await expect(footer(page)).toContainText('2 repositórios • 10 medições');
  });
});

test.describe('@US06.01-CA4 Detalhes de uma release intermediária ao passar o mouse', () => {
  // o tooltip do ECharts é desenhado ao passar o mouse sobre um ponto do canvas, sem posição no DOM para mirar
  test.skip('nome, encerramento, indicador e variação percentual em relação à release anterior (manual)', async () => {});
});

test.describe('@US06.01-CA5 Primeira release da série, sem base anterior', () => {
  // o mesmo tooltip do ECharts do CA4, no ponto da primeira release
  test.skip('nome, data, indicador e "Variação: sem base anterior para comparar" (manual)', async () => {});
});

test.describe('@US06.01-CA6 Produto sem releases: empty state orientativo', () => {
  test.use({ scenario: semReleases });

  test('explica por que o histórico não aparece e leva às releases, sem gráfico nem erro', async ({ page }) => {
    await page.goto(PRODUTO_PATH);
    await expect(page.getByRole('heading', { level: 6, name: NO_RELEASES })).toBeVisible();
    await expect(
      page.getByText('O Gráfico MSG acompanha o TSQMI dos repositórios marcando as releases planejadas de cada um.')
    ).toBeVisible();
    await expect(
      page.getByText('Cadastre a primeira release de MeasureSoftGram para acompanhar a evolução.')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir para Releases' })).toBeVisible();

    await expect(chart(page)).toHaveCount(0);
    await expect(footer(page)).toHaveCount(0);
    await expect(exportButton(page)).toHaveCount(0);
    // o anunciador de rota do Next também tem role=alert
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
  });
});

test.describe('@US06.01-CA7 Produto passa a ter releases: o empty state dá lugar ao histórico', () => {
  test.use({ scenario: semReleases });

  async function expectPulseInsteadOfEmptyState(page: Page) {
    await expect(footer(page)).toHaveText(
      '2 repositórios • 10 medições no período selecionado • 2 Releases no período • última medição: 10/10/2026'
    );
    await expect(chart(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 6, name: NO_RELEASES })).toHaveCount(0);
  }

  test('com as releases cadastradas, ao recarregar a tela o pulso aparece no lugar do empty state', async ({
    page,
    api
  }) => {
    await page.goto(PRODUTO_PATH);
    await expect(page.getByRole('heading', { level: 6, name: NO_RELEASES })).toBeVisible();

    api.set(PRODUTO_API.releaseHistory, releaseHistoryComDados);
    await page.reload();
    await expectPulseInsteadOfEmptyState(page);
  });

  test('com as releases cadastradas, ao ir às Releases e voltar pelo menu o pulso aparece no lugar do empty state', async ({
    page,
    api
  }) => {
    // o SWR do _app não refaz um pedido feito há menos de 60 s (dedupingInterval), e nada limpa o cache do histórico
    // quando uma release é criada: o relógio falso deixa passar esse minuto sem o teste esperar por ele
    await page.clock.install();
    await page.goto(PRODUTO_PATH);
    await expect(page.getByRole('heading', { level: 6, name: NO_RELEASES })).toBeVisible();

    api.set(RELEASES_API, releases);
    await page.getByRole('button', { name: 'Ir para Releases' }).click();
    await expect(page.getByRole('navigation').getByRole('heading', { level: 6, name: 'Releases' })).toBeVisible();

    api.set(PRODUTO_API.releaseHistory, releaseHistoryComDados);
    await page.clock.fastForward('01:01');
    await page.getByText('Visão Geral', { exact: true }).click();
    await expectPulseInsteadOfEmptyState(page);
  });
});
