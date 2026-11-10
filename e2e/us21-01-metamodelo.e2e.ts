import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { card as region, downloadCsv, select } from './support/helpers';
import { PRODUCT_PATH, semProduto } from './fixtures/common';
import {
  arvorePorRelease,
  comDados,
  erro500,
  METAMODELO_API,
  METAMODELO_PATH,
  semRelease
} from './fixtures/metamodelo';

const TITLE = '3. Estrutura das Medidas e Indicadores (Metamodelo)';
const CARD = 'Configuração do modelo de qualidade da release';

const card = (page: Page): Locator => region(page, CARD);
const chartArea = (page: Page) => page.getByTestId('metamodel-chart-area');
const releaseSelect = (page: Page) => select(page, 'Release');

/** Abre a página e espera a árvore desenhar: o data-render-ms só aparece quando o ECharts termina. */
async function openMetamodelo(page: Page) {
  await page.goto(METAMODELO_PATH);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(chartArea(page)).toHaveAttribute('data-render-ms', /^\d+$/);
}

/**
 * A árvore é desenhada em canvas (ECharts): o que ela contém é conferido pelo CSV, que leva a mesma árvore da release
 * escolhida, com todos os ramos (#89).
 */
const exportTree = (page: Page) =>
  downloadCsv(
    page,
    card(page).getByRole('button', { name: 'Exportar .csv' }),
    /^msgram-metamodelo-arvore-\d{4}-\d{2}-\d{2}\.csv$/
  );

const HEADER = 'Release;Nível;Chave;Nome;Entidade pai;Peso (%);Mínimo;Máximo';

const ARVORE_R2 = [
  HEADER,
  'R2;TSQMI;tsqmi;TSQMI;;;;',
  'R2;Característica;reliability;Reliability;TSQMI;60;;',
  'R2;Subcaracterística;testing_status;Testing Status;Reliability;100;;',
  'R2;Medida;passed_tests;Passed Tests;Testing Status;50;0;1',
  'R2;Métrica;tests;tests;Passed Tests;;;',
  'R2;Medida;ci_feedback_time;CI Feedback Time;Testing Status;50;0;900',
  'R2;Métrica;sum_ci_feedback_times;sum_ci_feedback_times;CI Feedback Time;;;',
  'R2;Métrica;total_builds;total_builds;CI Feedback Time;;;',
  'R2;Característica;maintainability;Maintainability;TSQMI;40;;',
  'R2;Subcaracterística;modifiability;Modifiability;Maintainability;100;;',
  'R2;Medida;non_complex_file_density;Non Complex File Density;Modifiability;70;0;10',
  'R2;Métrica;complexity;complexity;Non Complex File Density;;;',
  'R2;Medida;build_stability;Build Stability;Modifiability;30;0;1',
  'R2;Métrica;total_builds;total_builds;Build Stability;;;'
];

test.describe('@US21.01-CA1 Item "3. Estrutura das Medidas e Indicadores (Metamodelo)" no submenu Dashboards', () => {
  test.use({ scenario: comDados });

  test('aparece com um produto selecionado e leva à página', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await page.getByText('Dashboards', { exact: true }).click();
    await page.getByText(TITLE, { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/metamodelo\/?$/);
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

test.describe('@US21.01-CA2 Árvore TSQMI → métricas da configuração da release, na release atual', () => {
  test.use({ scenario: comDados });

  test('abre na release atual com a árvore inteira da configuração dela', async ({ page }) => {
    await openMetamodelo(page);
    await expect(releaseSelect(page)).toHaveText('R2 (atual)');
    expect(await exportTree(page)).toEqual(ARVORE_R2);
  });

  test('desenho da árvore com TSQMI e características abertos (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openMetamodelo(page);
    await expect(chartArea(page)).toHaveScreenshot('arvore-r2.png');
  });
});

test.describe('@US21.01-CA3 Nome e peso em cada nó, referência nas medidas e descrição ao clicar', () => {
  test.use({ scenario: comDados });

  test('o TSQMI não tem peso; os outros níveis têm; as medidas trazem mínimo e máximo', async ({ page }) => {
    await openMetamodelo(page);
    const rows = (await exportTree(page)).map((line) => line.split(';'));
    const tsqmi = rows.find((row) => row[1] === 'TSQMI');
    expect(tsqmi?.[5]).toBe('');
    rows
      .filter((row) => ['Característica', 'Subcaracterística', 'Medida'].includes(row[1]))
      .forEach((row) => expect(row[5], `peso de ${row[3]}`).toMatch(/^\d+$/));
    rows
      .filter((row) => row[1] === 'Medida')
      .forEach((row) => expect([row[6], row[7]], `referência de ${row[3]}`).not.toContain(''));
  });

  test.describe('com a tela larga', () => {
    // aberta, a árvore passa da largura do card, que rola por dentro; com a tela larga, as medidas cabem na foto
    test.use({ viewport: { width: 2400, height: 900 } });

    test('desenho com a árvore toda aberta: peso em cada nó e mínimo e máximo nas medidas (snapshot)', async ({
      page
    }) => {
      test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
      await openMetamodelo(page);
      await card(page).getByRole('button', { name: 'Expandir tudo' }).click();
      await expect(card(page).getByRole('button', { name: 'Recolher tudo' })).toBeVisible();
      // o canvas só acompanha a nova largura da área depois de um quadro
      await expect
        .poll(() =>
          chartArea(page).evaluate(
            (element) => (element.querySelector('canvas')?.clientWidth ?? 0) >= element.clientWidth - 1
          )
        )
        .toBe(true);
      await expect(chartArea(page)).toHaveScreenshot('arvore-r2-expandida.png');
    });
  });

  // o clique cai num nó desenhado em canvas: a posição não está no DOM
  test.skip('clicar num nó mostra o nome, o tipo, o peso e a descrição da entidade (manual)', async () => {});
});

test.describe('@US21.01-CA4 Expandir e colapsar os níveis do modelo', () => {
  test.use({ scenario: comDados });

  test('"Expandir tudo" abre medidas e métricas e "Recolher tudo" volta ao padrão', async ({ page }) => {
    await openMetamodelo(page);
    // a área acompanha os níveis abertos: com medidas e métricas, a árvore fica mais larga
    const width = async () => chartArea(page).evaluate((element) => parseFloat(getComputedStyle(element).minWidth));
    const collapsed = await width();

    await card(page).getByRole('button', { name: 'Expandir tudo' }).click();
    await expect(card(page).getByRole('button', { name: 'Recolher tudo' })).toBeVisible();
    await expect.poll(width).toBeGreaterThan(collapsed);

    await card(page).getByRole('button', { name: 'Recolher tudo' }).click();
    await expect(card(page).getByRole('button', { name: 'Expandir tudo' })).toBeVisible();
    await expect.poll(width).toBe(collapsed);
  });

  // abrir um ramo só é clicar no "+" do nó, desenhado em canvas
  test.skip('abrir e fechar um ramo pelo "+" do nó (manual)', async () => {});
});

test.describe('@US21.01-CA5 Trocar a release troca a árvore sem recarregar a página', () => {
  test.use({ scenario: comDados });

  test('na R1, a árvore é a da configuração da R1', async ({ page }) => {
    await openMetamodelo(page);
    // uma marca na janela some se a página recarregar
    await page.evaluate(() => Object.assign(window, { semRecarregar: true }));

    await releaseSelect(page).click();
    await page.getByRole('option', { name: 'R1', exact: true }).click();
    await expect(releaseSelect(page)).toHaveText('R1');
    await expect(chartArea(page)).toHaveAttribute('data-render-ms', /^\d+$/);

    expect(await exportTree(page)).toEqual([
      HEADER,
      'R1;TSQMI;tsqmi;TSQMI;;;;',
      'R1;Característica;maintainability;Maintainability;TSQMI;100;;',
      'R1;Subcaracterística;modifiability;Modifiability;Maintainability;100;;',
      'R1;Medida;non_complex_file_density;Non Complex File Density;Modifiability;100;0;10',
      'R1;Métrica;complexity;complexity;Non Complex File Density;;;'
    ]);
    expect(await page.evaluate(() => (window as unknown as { semRecarregar?: boolean }).semRecarregar)).toBe(true);
  });
});

test.describe('@US21.01-CA6 Só entidades da configuração; métrica repetida sob cada medida', () => {
  test.use({ scenario: comDados });

  // "só entidades da configuração" é do Service, que devolve a árvore da configuração da release (fora do Front)
  test('total_builds aparece sob CI Feedback Time e sob Build Stability', async ({ page }) => {
    await openMetamodelo(page);
    const lines = await exportTree(page);
    expect(lines.filter((line) => line.includes(';total_builds;total_builds;'))).toEqual([
      'R2;Métrica;total_builds;total_builds;CI Feedback Time;;;',
      'R2;Métrica;total_builds;total_builds;Build Stability;;;'
    ]);
  });
});

test.describe('@US21.01-CA7 Estados sem release e erro com "Tentar novamente"', () => {
  test.describe('produto sem release', () => {
    test.use({ scenario: semRelease });

    test('orienta a planejar a primeira release', async ({ page }) => {
      await page.goto(METAMODELO_PATH);
      await expect(card(page).getByText('Este produto ainda não tem uma release configurada')).toBeVisible();
      await expect(card(page).getByRole('button', { name: 'Planejar release' })).toBeVisible();
    });
  });

  test.describe('erro 500 na árvore', () => {
    test.use({ scenario: erro500 });

    test('mostra a falha sem detalhes técnicos, e "Tentar novamente" carrega a árvore', async ({ page, api }) => {
      await page.goto(METAMODELO_PATH);
      const retry = card(page).getByRole('button', { name: 'Tentar novamente' });
      await expect(retry).toBeVisible();
      await expect(card(page)).not.toContainText(/500|Erro interno|Request failed/);

      api.set(METAMODELO_API.tree, arvorePorRelease);
      await retry.click();
      await expect(chartArea(page)).toHaveAttribute('data-render-ms', /^\d+$/);
    });
  });
});
