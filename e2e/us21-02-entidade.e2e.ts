import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { PRODUCT_PATH } from './fixtures/common';
import {
  comDados,
  ENTITY_API,
  ENTITY_PATH,
  erro500,
  erroComposicao,
  matrixOf,
  semAnalise,
  semProduto,
  semRelease
} from './fixtures/entidade';

const TITLE = '4. Análise por Entidade';
const HEATMAP = 'Mapa de calor: repositório × medida';
const CONTRIBUTION = 'O que puxa a qualidade total para baixo';
const RANKING = 'Ranking dos piores pares';

// sem idioma salvo o app abre em inglês; os critérios estão em português
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale_lang', 'pt'));
});

/** O cartão de um quadro (section com aria-label). */
const card = (page: Page, title: string): Locator => page.getByRole('region', { name: title });
const heatmap = (page: Page) => page.getByRole('table', { name: 'Mapa de calor' });
const ranking = (page: Page) => page.getByRole('table', { name: RANKING });
const releaseSelect = (page: Page) => page.getByRole('combobox', { name: /^Release/ });
const levelTab = (page: Page, label: string) =>
  page.getByRole('tablist', { name: 'Nível do modelo' }).getByRole('tab', { name: label, exact: true });
/** A célula do mapa é um botão com o repositório, a entidade e o valor no nome acessível. */
const cell = (page: Page, name: string) => heatmap(page).getByRole('button', { name });

/** Abre a página e espera o mapa desenhar: o data-render-ms só aparece no quadro seguinte ao do mapa montado. */
async function openEntity(page: Page) {
  await page.goto(ENTITY_PATH);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByTestId('entity-heatmap')).toHaveAttribute('data-render-ms', /^\d+$/);
}

/** Clique na aba logo depois da carga às vezes não pega: clica de novo até a aba ficar selecionada. */
async function chooseLevel(page: Page, label: string) {
  const tab = levelTab(page, label);
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
  }).toPass();
}

async function chooseRelease(page: Page, option: string) {
  await releaseSelect(page).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('@US21.02-CA1 Item "4. Análise por Entidade" no submenu Dashboards', () => {
  test.use({ scenario: comDados });

  test('aparece com um produto selecionado e leva à página', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await page.getByText('Dashboards', { exact: true }).click();
    await page.getByText(TITLE, { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/entidade\/?$/);
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

test.describe('@US21.02-CA2 Release (padrão a atual), nível e caminho na hierarquia do modelo', () => {
  test.use({ scenario: comDados });

  test('abre na release atual e no nível medida, com o caminho até as medidas', async ({ page }) => {
    await openEntity(page);
    await expect(releaseSelect(page)).toHaveText('R2 (atual)');
    await expect(page.getByRole('tablist', { name: 'Nível do modelo' }).getByRole('tab')).toHaveText([
      'Característica',
      'Subcaracterística',
      'Medida'
    ]);
    await expect(levelTab(page, 'Medida')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('entity-level-path')).toHaveText(
      'TSQMI › todas as características › todas as subcaracterísticas › medidas'
    );
    // só as entidades que a matriz do Service traz (a configuração da release é regra do Service)
    await expect(heatmap(page).locator('th[scope="col"]')).toHaveText([
      'Repositório',
      'Passed Tests · 33%passed_tests',
      'Test Coverage · 34%test_coverage',
      'CI Feedback Time · 100%ci_feedback_time',
      'Commented File Density · 25%commented_file_density',
      'TSQMI · Δ'
    ]);
  });

  test('a troca de nível muda o caminho e as colunas do mapa', async ({ page }) => {
    await openEntity(page);
    await chooseLevel(page, 'Característica');
    await expect(page.getByTestId('entity-level-path')).toHaveText('TSQMI › características');
    await expect(card(page, 'Mapa de calor: repositório × característica')).toBeVisible();
    await expect(heatmap(page).locator('th[scope="col"]')).toHaveText([
      'Repositório',
      'Reliability · 34%reliability',
      'Maintainability · 33%maintainability',
      'TSQMI · Δ'
    ]);

    await chooseLevel(page, 'Subcaracterística');
    await expect(page.getByTestId('entity-level-path')).toHaveText(
      'TSQMI › todas as características › subcaracterísticas'
    );
    await expect(heatmap(page).locator('th[scope="colgroup"]')).toHaveText([
      'Reliability · 34%',
      'Maintainability · 33%'
    ]);
    await expect(heatmap(page).locator('th[scope="col"]')).toHaveText([
      'Repositório',
      'Testing Status · 50%testing_status',
      'Maturity · 50%maturity',
      'Modifiability · 100%modifiability',
      'TSQMI · Δ'
    ]);
  });

  test('a troca de release atualiza o mapa', async ({ page }) => {
    await openEntity(page);
    await releaseSelect(page).click();
    await expect(page.getByRole('option')).toHaveText(['R2 (atual)', 'R1']);
    await page.getByRole('option', { name: 'R1', exact: true }).click();
    await expect(releaseSelect(page)).toHaveText('R1');
    await expect(page.getByTestId('tsqmi-2')).toHaveText('0,50C · —');
  });
});

test.describe('@US21.02-CA3 Mapa de calor repositório × entidade, com as faixas A a E', () => {
  test.use({ scenario: comDados });

  test('as colunas ficam agrupadas pelas entidades de cima, com o nome e o peso', async ({ page }) => {
    await openEntity(page);
    const groups = heatmap(page).locator('th[scope="colgroup"]');
    await expect(groups).toHaveText([
      'Reliability · 34%',
      'Maintainability · 33%',
      'Testing Status · 50%',
      'Maturity · 50%',
      'Modifiability · 100%'
    ]);
    // Reliability cobre as três medidas dela; Testing Status, as duas
    await expect(groups.nth(0)).toHaveAttribute('colspan', '3');
    await expect(groups.nth(2)).toHaveAttribute('colspan', '2');
  });

  test('cada célula mostra o valor de 0 a 1 e o grau, com a cor da faixa', async ({ page }) => {
    await openEntity(page);
    // uma célula de cada faixa, com as cores do guia de IDV (qualityBands.ts)
    const bands = [
      ['MeasureSoftGram-Front · Passed Tests: 0,91 (A, Ótimo)', '0,91A', 'rgb(4, 114, 77)'],
      ['MeasureSoftGram-Action · Passed Tests: 0,74 (B, Muito bom)', '0,74B', 'rgb(13, 200, 137)'],
      ['MeasureSoftGram-Service · Commented File Density: 0,50 (C, Bom)', '0,50C', 'rgb(235, 161, 51)'],
      ['MeasureSoftGram-Action · CI Feedback Time: 0,35 (D, Ruim)', '0,35D', 'rgb(241, 97, 65)'],
      ['MeasureSoftGram-Action · Test Coverage: 0,18 (E, Muito ruim)', '0,18E', 'rgb(190, 46, 14)']
    ];
    await Promise.all(
      bands.map(async ([name, text, color]) => {
        await expect(cell(page, name)).toHaveText(text);
        await expect(cell(page, name)).toHaveCSS('background-color', color);
      })
    );
  });

  test('as linhas vão do pior para o melhor TSQMI, e a última coluna tem o TSQMI, o grau e a Δ', async ({ page }) => {
    await openEntity(page);
    await expect(heatmap(page).getByRole('rowheader')).toHaveText([
      'MeasureSoftGram-Action',
      'MeasureSoftGram-Front',
      'MeasureSoftGram-Service'
    ]);
    await expect(heatmap(page).locator('tbody tr')).toHaveText([
      'MeasureSoftGram-Action0,74B0,18E0,35D0,30D0,41C · −0,09',
      'MeasureSoftGram-Front0,91A0,32Dsem dado0,22D0,53C · −0,07',
      'MeasureSoftGram-Service0,99A0,81A0,78B0,50C0,67B · −0,03'
    ]);
    await expect(card(page, HEATMAP)).toContainText('Δ é a variação em relação à release anterior, R1.');
  });

  test('a legenda mostra as 5 faixas', async ({ page }) => {
    await openEntity(page);
    const legend = page.getByTestId('quality-grade-legend');
    await Promise.all(
      [
        'A[0,80; 1,00] Ótimo',
        'B[0,60; 0,80) Muito bom',
        'C[0,40; 0,60) Bom',
        'D[0,20; 0,40) Ruim',
        'E[0,00; 0,20) Muito ruim'
      ].map((band) => expect(legend).toContainText(band))
    );
  });
});

test.describe('@US21.02-CA4 As 3 células que mais puxaram a queda ficam destacadas, com a frase de leitura', () => {
  test.use({ scenario: comDados });

  test('destaca as 3 maiores contribuições negativas', async ({ page }) => {
    await openEntity(page);
    const highlighted = heatmap(page).locator('[data-highlighted]');
    await expect(highlighted).toHaveCount(3);
    // na ordem do mapa: Action (−0,017 e −0,012) e Front (−0,021), as três maiores pioras do quadro de contribuição
    const names = [
      'MeasureSoftGram-Action · Test Coverage',
      'MeasureSoftGram-Action · Commented File Density',
      'MeasureSoftGram-Front · Test Coverage'
    ];
    await Promise.all(
      names.map((name, index) =>
        expect(highlighted.nth(index)).toHaveAttribute(
          'aria-label',
          new RegExp(`^${name}: .*, entre as maiores contribuições para a queda$`)
        )
      )
    );
    await expect(highlighted.first()).toHaveCSS('outline-style', 'solid');
    await expect(cell(page, 'MeasureSoftGram-Action · CI Feedback Time')).toHaveCSS('outline-style', 'none');
    await expect(page.getByTestId('quality-grade-legend')).toContainText(
      'entre as 3 maiores contribuições para a queda'
    );
  });

  test('a leitura diz a entidade mais fraca e a de maior dispersão, com o menor e o maior valor', async ({ page }) => {
    await openEntity(page);
    // médias: Commented File Density (0,50 + 0,30 + 0,22) / 3 = 0,34; Test Coverage vai de 0,18 a 0,81
    await expect(page.getByTestId('entity-reading')).toHaveText(
      'Leitura: Commented File Density é a medida mais fraca do produto (média 0,34). Test Coverage tem a maior ' +
        'dispersão entre os repositórios: de 0,18 (MeasureSoftGram-Action) a 0,81 (MeasureSoftGram-Service).'
    );
  });
});

test.describe('@US21.02-CA5 "O que puxa a qualidade total para baixo", da maior piora à maior melhora', () => {
  test.use({ scenario: comDados });

  test('os pares vão da maior piora para a maior melhora, com piora e melhora em cores diferentes', async ({
    page
  }) => {
    await openEntity(page);
    const contribution = card(page, CONTRIBUTION);
    await expect(contribution).toContainText('de R1 para R2');
    const rows = contribution.getByTestId('contribution-row');
    await expect(rows).toHaveText([
      'MeasureSoftGram-Fronttest_coverage−0,021',
      'MeasureSoftGram-Actiontest_coverage−0,017',
      'MeasureSoftGram-Actioncommented_file_density−0,012',
      'MeasureSoftGram-Actionci_feedback_time−0,008',
      'MeasureSoftGram-Servicetest_coverage−0,004',
      'MeasureSoftGram-Serviceci_feedback_time−0,002',
      'MeasureSoftGram-Frontcommented_file_density−0,002',
      'MeasureSoftGram-Frontpassed_tests+0,001',
      'MeasureSoftGram-Servicecommented_file_density+0,003',
      'MeasureSoftGram-Actionpassed_tests+0,005'
    ]);
    // piora em vermelho (#B42318) e melhora em azul (#1F6FB2)
    await expect(rows.first().getByText('−0,021')).toHaveCSS('color', 'rgb(180, 35, 24)');
    await expect(rows.last().getByText('+0,005')).toHaveCSS('color', 'rgb(31, 111, 178)');
  });
});

test.describe('@US21.02-CA6 "Ranking dos piores pares", do menor valor para o maior, com o grau e a Δ', () => {
  test.use({ scenario: comDados });

  test('lista os pares do menor para o maior valor, no máximo 10', async ({ page }) => {
    await openEntity(page);
    await expect(card(page, RANKING)).toContainText('Nível: Medida');
    // são 11 pares com valor: o Service × passed_tests (0,99) fica de fora
    await expect(ranking(page).locator('tbody tr')).toHaveText([
      '1MeasureSoftGram-Actiontest_coverage0,18 E−0,29',
      '2MeasureSoftGram-Frontcommented_file_density0,22 D−0,02',
      '3MeasureSoftGram-Actioncommented_file_density0,30 D−0,11',
      '4MeasureSoftGram-Fronttest_coverage0,32 D−0,36',
      '5MeasureSoftGram-Actionci_feedback_time0,35 D−0,05',
      '6MeasureSoftGram-Servicecommented_file_density0,50 C+0,02',
      '7MeasureSoftGram-Actionpassed_tests0,74 B+0,04',
      '8MeasureSoftGram-Serviceci_feedback_time0,78 B−0,02',
      '9MeasureSoftGram-Servicetest_coverage0,81 A−0,04',
      '10MeasureSoftGram-Frontpassed_tests0,91 A+0,01'
    ]);
  });
});

test.describe('@US21.02-CA7 Ao clicar numa célula, os filhos da entidade com o peso e o valor', () => {
  test.use({ scenario: comDados });

  test('no nível característica, a célula abre as subcaracterísticas do repositório', async ({ page }) => {
    await openEntity(page);
    await chooseLevel(page, 'Característica');
    await cell(page, 'MeasureSoftGram-Action · Reliability: 0,42 (C, Bom)').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Reliability em MeasureSoftGram-Action');
    await expect(dialog).toContainText('Valor: 0,42 (C, Bom)');
    const children = dialog.getByRole('table', { name: 'Filhos de Reliability' });
    await expect(children.getByRole('row')).toHaveText([
      'SubcaracterísticaPesoValor',
      'Testing Status50%0,45 (C, Bom)',
      'Maturity50%0,35 (D, Ruim)'
    ]);

    await dialog.getByRole('button', { name: 'Fechar' }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('@US21.02-CA8 "sem dado" no lugar de zero e a primeira release sem variação', () => {
  test.use({ scenario: comDados });

  test('a célula sem valor mostra "sem dado", sem número nem grau', async ({ page }) => {
    await openEntity(page);
    const empty = cell(page, 'MeasureSoftGram-Front · CI Feedback Time');
    await expect(empty).toHaveAccessibleName('MeasureSoftGram-Front · CI Feedback Time: sem dado');
    await expect(empty).toHaveText('sem dado');
  });

  test('na primeira release, a Δ é "—" e o quadro de contribuição explica a falta da anterior', async ({ page }) => {
    await openEntity(page);
    await chooseRelease(page, 'R1');
    await expect(releaseSelect(page)).toHaveText('R1');

    const contribution = card(page, CONTRIBUTION);
    await expect(contribution).toContainText('R1 é a primeira release do produto');
    await expect(contribution).toContainText(
      'Não há release anterior para comparar. A contribuição de cada par aparece a partir da próxima release.'
    );
    await expect(contribution.getByTestId('contribution-row')).toHaveCount(0);

    await expect(heatmap(page).locator('th[scope="col"]').last()).toHaveText('TSQMI');
    await expect(page.getByTestId('tsqmi-2')).toHaveText('0,50C · —');
    await expect(ranking(page).locator('tbody tr td:last-child')).toHaveText(Array(10).fill('—'));
  });
});

test.describe('@US21.02-CA9 Estados vazios e erro com "Tentar novamente"', () => {
  test.describe('produto sem release', () => {
    test.use({ scenario: semRelease });

    test('convida a planejar a primeira release', async ({ page }) => {
      await page.goto(ENTITY_PATH);
      const empty = card(page, 'Produto sem release');
      await expect(empty).toContainText('Este produto ainda não tem release');
      await expect(empty.getByRole('button', { name: 'Planejar release' })).toBeVisible();
      await expect(page.getByRole('tab')).toHaveCount(0);
    });
  });

  test.describe('release sem análise', () => {
    test.use({ scenario: semAnalise });

    test('explica a falta e diz quando os valores aparecem', async ({ page }) => {
      await page.goto(ENTITY_PATH);
      const empty = card(page, HEATMAP);
      await expect(empty).toContainText('A release R2 ainda não tem análises');
      await expect(empty).toContainText('entre 17/08 e 16/10, o período da release');
      await expect(heatmap(page)).toHaveCount(0);
    });
  });

  test.describe('erro 500 na matriz', () => {
    test.use({ scenario: erro500 });

    test('mostra a falha com "Tentar novamente", sem detalhes técnicos, e carrega ao tentar de novo', async ({
      page,
      api
    }) => {
      await page.goto(ENTITY_PATH);
      const error = card(page, 'Análise por Entidade');
      await expect(error).toContainText('Não foi possível carregar a análise por entidade');
      await expect(error).not.toContainText(/500|Erro interno|Request failed/);

      api.set(ENTITY_API.matrix, matrixOf);
      await error.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByTestId('entity-heatmap')).toHaveAttribute('data-render-ms', /^\d+$/);
    });
  });

  test.describe('erro 500 na composição da célula', () => {
    test.use({ scenario: erroComposicao });

    test('o diálogo mostra a falha com "Tentar novamente", sem detalhes técnicos', async ({ page }) => {
      await openEntity(page);
      await chooseLevel(page, 'Característica');
      await cell(page, 'MeasureSoftGram-Action · Reliability').click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Não foi possível carregar a composição.');
      await expect(dialog.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
      await expect(dialog).not.toContainText(/500|Erro interno|Request failed/);
    });
  });
});
