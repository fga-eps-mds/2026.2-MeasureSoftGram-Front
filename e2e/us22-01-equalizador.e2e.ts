import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { comDados, duasCaracteristicas, RELEASE_PATH, semAnalise, semPlanejamento } from './fixtures/release';

const CHARACTERISTICS = ['Confiabilidade', 'Manutenibilidade', 'Adequação Funcional', 'Segurança'];
const KEYS = ['reliability', 'maintainability', 'functional_suitability', 'security'];

const equalizer = (page: Page) => page.getByTestId('planned-vs-accomplished-equalizer');
const tracks = (page: Page) => page.getByTestId(/^equalizer-track-/);
const vectors = (page: Page) => page.getByRole('table', { name: 'Exibir valores' });

/** Abre a release e espera o equalizador montar os trilhos. */
async function openRelease(page: Page) {
  await page.goto(RELEASE_PATH);
  await expect(page.getByTestId('release-name')).toHaveText('R2');
  await expect(equalizer(page)).toBeVisible();
}

/** Células de uma linha dos vetores, sem o rótulo da linha. */
const rowCells = (page: Page, testId: string): Locator => vectors(page).getByTestId(testId).getByRole('cell');

/**
 * As curvas só ganham o traçado depois que o ResizeObserver mede os trilhos: uma Bézier (C) entre trilhos com valor,
 * ou um traço curto (L) num valor isolado entre lacunas.
 */
async function expectCurveDrawn(curve: Locator) {
  await expect(curve).toHaveAttribute('d', /^M[\d.]+ [\d.]+ [CL]/);
}

/**
 * Segura o chunk com as traduções em português (o i18n do app vem num chunk do webpack por idioma, ver
 * src/shared/i18n/bundledBackend.ts) até o teste chamar a função devolvida. O nome do chunk muda a cada build, então ele
 * é reconhecido por um texto do equalizador.
 */
async function holdPortugueseTranslations(page: Page): Promise<() => void> {
  let holding = true;
  let open = () => {};
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  await page.route('**/_next/static/chunks/*.js', async (route) => {
    // depois de liberar, não lê mais corpo nenhum: um prefetch no fim do teste chegaria com a página já fechada
    if (!holding) return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes('Cursor: valor planejado')) await gate;
    return route.fulfill({ response, body });
  });
  return () => {
    holding = false;
    open();
  };
}

/** Maior distância, em px, entre as pontas da curva e o centro do primeiro e do último trilho. */
async function curveOffsetFromTracks(page: Page, curve: Locator, keys: string[]): Promise<number> {
  const [box, first, last] = await Promise.all([
    curve.boundingBox(),
    page.getByTestId(`equalizer-slider-${keys[0]}`).boundingBox(),
    page.getByTestId(`equalizer-slider-${keys[keys.length - 1]}`).boundingBox()
  ]);
  if (!box || !first || !last) return Infinity;
  return Math.max(
    Math.abs(box.x - (first.x + first.width / 2)),
    Math.abs(box.x + box.width - (last.x + last.width / 2))
  );
}

test.describe('@US22.01-CA1 Mesmo equalizador do planejamento, um trilho por característica planejada', () => {
  test.use({ scenario: comDados });

  test('mostra um trilho para cada característica planejada', async ({ page }) => {
    await openRelease(page);
    await expect(tracks(page)).toHaveCount(KEYS.length);
    await Promise.all(KEYS.map((key) => expect(page.getByTestId(`equalizer-track-${key}`)).toBeVisible()));
  });

  test('desenho dos trilhos, das curvas e da legenda (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openRelease(page);
    await expectCurveDrawn(page.getByTestId('equalizer-curve-accomplished'));
    await expect(equalizer(page)).toHaveScreenshot('equalizador-r2.png');
  });
});

test.describe('@US22.01-CA2 Cursor de cada trilho no valor planejado (Rp)', () => {
  test.use({ scenario: comDados });

  test('o cursor vertical de cada trilho marca o Rp da característica', async ({ page }) => {
    await openRelease(page);
    const planned = ['0.7', '0.6', '0.5', '0.4'];
    await Promise.all(
      KEYS.map(async (key, index) => {
        const slider = page.getByTestId(`equalizer-slider-${key}`).getByRole('slider');
        await expect(slider).toHaveAttribute('aria-valuenow', planned[index]);
        await expect(slider).toHaveAttribute('aria-orientation', 'vertical');
      })
    );
  });
});

test.describe('@US22.01-CA3 Curvas do planejado (azul) e do realizado (laranja) sobre o equalizador', () => {
  test.use({ scenario: comDados });

  test('as duas curvas são desenhadas com as cores do planejado e do realizado', async ({ page }) => {
    await openRelease(page);
    const plannedCurve = page.getByTestId('equalizer-curve-planned');
    const accomplishedCurve = page.getByTestId('equalizer-curve-accomplished');
    await expectCurveDrawn(plannedCurve);
    await expectCurveDrawn(accomplishedCurve);
    await expect(plannedCurve).toHaveAttribute('stroke', '#1F60C4');
    await expect(accomplishedCurve).toHaveAttribute('stroke', '#FF8C00');
  });

  test.describe('com duas características', () => {
    test.use({ scenario: duasCaracteristicas });

    // o rótulo sem tradução é mais largo que o trilho e desloca o slider; com a tradução ele volta para o lugar, sem o
    // contêiner mudar de tamanho, e as curvas têm de ir junto (bug visto no CI: curvas à direita dos trilhos)
    test('as curvas acompanham os trilhos quando a tradução chega depois do equalizador', async ({ page }) => {
      const releaseTranslations = await holdPortugueseTranslations(page);
      // o chunk segurado prende o evento load
      await page.goto(RELEASE_PATH, { waitUntil: 'commit' });
      const curves = [page.getByTestId('equalizer-curve-planned'), page.getByTestId('equalizer-curve-accomplished')];
      await Promise.all(curves.map(expectCurveDrawn));
      // antes do português chegar, o rótulo está em outro texto (na stack nova, o inglês já carregado)
      await expect(page.getByTestId('equalizer-track-reliability')).not.toContainText('Confiabilidade');

      releaseTranslations();
      await expect(page.getByTestId('equalizer-track-reliability')).toContainText('Confiabilidade');
      const keys = ['reliability', 'maintainability'];
      // a caixa da curva inclui a ponta redonda do traço (3 px de espessura, 1,5 px além do ponto); antes, sobravam 34 px
      await Promise.all(
        curves.map((curve) => expect.poll(() => curveOffsetFromTracks(page, curve, keys)).toBeLessThan(2))
      );
    });
  });
});

test.describe('@US22.01-CA4 Legenda do planejado, do realizado e do cursor', () => {
  test.use({ scenario: comDados });

  test('a legenda identifica as duas curvas e o cursor', async ({ page }) => {
    await openRelease(page);
    const legend = page.getByTestId('equalizer-legend');
    await expect(legend).toContainText('Planejado (Rp)');
    await expect(legend).toContainText('Realizado (Rd)');
    await expect(legend).toContainText('Cursor: valor planejado');
  });
});

test.describe('@US22.01-CA5 Vetores Rp, Rd, Rc e Rp−Rd abaixo do equalizador, na ordem das características', () => {
  test.use({ scenario: comDados });

  test('as colunas seguem a ordem dos trilhos e cada vetor tem um valor por característica', async ({ page }) => {
    await openRelease(page);
    await expect(vectors(page).getByRole('columnheader')).toHaveText(['', ...CHARACTERISTICS]);
    await expect(vectors(page).getByRole('rowheader')).toHaveText([
      'Rp',
      'Rd',
      'Rc = max(0, Rp − Rd)',
      'Rp − Rd',
      'Situação'
    ]);
    await expect(rowCells(page, 'vector-rp')).toHaveText(['0.70', '0.60', '0.50', '0.40']);
    await expect(rowCells(page, 'vector-rd')).toHaveText(['0.74', '0.60', '0.35', '0.25']);
  });
});

test.describe('@US22.01-CA6 Valores calculados conforme as funções do modelo', () => {
  test.use({ scenario: comDados });

  // Rp e Rd vêm do Service, assim como o desvio geral (norm_diff); o Front calcula Rc, a diferença e a situação
  test('Rc = max(0, Rp − Rd), a diferença com sinal e o desvio geral do repositório', async ({ page }) => {
    await openRelease(page);
    await expect(rowCells(page, 'vector-rc')).toHaveText(['0.00', '0.00', '0.15', '0.15']);
    await expect(rowCells(page, 'vector-delta')).toHaveText(['-0.04', '0.00', '0.15', '0.15']);
    await expect(page.getByTestId('equalizer-norm-diff')).toHaveText('Diferença normalizada: 0.21');
  });
});

test.describe('@US22.01-CA7 Ao passar o mouse numa característica, planejado, realizado, diferença e situação', () => {
  test.use({ scenario: comDados });

  test('o tooltip do trilho traz os quatro valores', async ({ page }) => {
    await openRelease(page);
    await page.getByTestId('equalizer-track-reliability').hover();
    const tooltip = page.getByTestId('equalizer-tooltip-reliability');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Confiabilidade');
    await expect(tooltip).toContainText('Planejado (Rp): 0.70');
    await expect(tooltip).toContainText('Realizado (Rd): 0.74');
    await expect(tooltip).toContainText('Diferença (Rp − Rd): -0.04');
    await expect(tooltip).toContainText('Situação: ▲ Acima do planejado');
  });
});

test.describe('@US22.01-CA8 A situação não é indicada só por cor', () => {
  test.use({ scenario: comDados });

  test('cada situação tem símbolo e texto, na tabela e no nome acessível do trilho', async ({ page }) => {
    await openRelease(page);
    await expect(rowCells(page, 'vector-status')).toHaveText([
      '▲ Acima do planejado',
      '= Igual ao planejado',
      '▼ Abaixo do planejado',
      '▼ Abaixo do planejado'
    ]);
    await expect(page.getByTestId('equalizer-track-reliability')).toHaveAttribute('aria-label', /Acima do planejado$/);
  });
});

test.describe('@US22.01-CA9 Com poucas características, proporções legíveis sem ocupar a tela inteira', () => {
  test.use({ scenario: duasCaracteristicas });

  test('com duas características, cada trilho fica com no máximo 120 px de largura', async ({ page }) => {
    await openRelease(page);
    await expect(tracks(page)).toHaveCount(2);
    const boxes = await Promise.all((await tracks(page).all()).map((track) => track.boundingBox()));
    boxes.forEach((box) => expect(box?.width).toBeLessThanOrEqual(120));
  });

  test('desenho do equalizador com duas características (snapshot)', async ({ page }) => {
    test.skip(!process.env.CI, 'a baseline do snapshot é gerada no CI (Linux), nunca no Mac');
    await openRelease(page);
    await expectCurveDrawn(page.getByTestId('equalizer-curve-accomplished'));
    await expect(equalizer(page)).toHaveScreenshot('equalizador-duas-caracteristicas.png');
  });
});

test.describe('@US22.01-CA10 Release planejada sem análise: só o planejado e o aviso', () => {
  test.use({ scenario: semAnalise });

  test('mostra o planejado, sem a curva e a situação do realizado, e explica a falta', async ({ page }) => {
    await openRelease(page);
    await expect(page.getByTestId('equalizer-no-accomplished')).toHaveText(
      'Ainda não há dados realizados para esta release. São exibidos apenas os valores planejados.'
    );
    await expect(tracks(page)).toHaveCount(KEYS.length);
    await expectCurveDrawn(page.getByTestId('equalizer-curve-planned'));
    await expect(page.getByTestId('equalizer-curve-accomplished')).toHaveCount(0);
    await expect(page.getByTestId('equalizer-legend')).not.toContainText('Realizado');
    await expect(vectors(page).getByTestId('vector-status')).toHaveCount(0);
  });
});

test.describe('@US22.01-CA11 Release sem planejamento: sem equalizador e com o pedido para planejar', () => {
  test.use({ scenario: semPlanejamento });

  test('não mostra os trilhos e orienta a planejar a release', async ({ page }) => {
    await page.goto(RELEASE_PATH);
    await expect(page.getByTestId('equalizer-no-planning')).toHaveText(
      'Esta release não possui planejamento. Planeje a release para ver a comparação entre o planejado e o realizado.'
    );
    await expect(tracks(page)).toHaveCount(0);
  });
});

test.describe('@US22.01-CA12 Característica sem realizado aparece como sem dado, e não como zero', () => {
  test.use({ scenario: comDados });

  test('no repositório sem Manutenibilidade, o Rd fica "Sem dado" e o Rc e a diferença ficam vazios', async ({
    page
  }) => {
    await openRelease(page);
    await page.getByRole('tab', { name: 'MeasureSoftGram-Front' }).click();
    await expect(page.getByTestId('equalizer-norm-diff')).toHaveText('Diferença normalizada: 0.30');
    await expect(rowCells(page, 'vector-rd').nth(1)).toHaveText('Sem dado');
    await expect(rowCells(page, 'vector-rc').nth(1)).toHaveText('—');
    await expect(rowCells(page, 'vector-delta').nth(1)).toHaveText('—');
    await expect(rowCells(page, 'vector-status').nth(1)).toHaveText('— Sem dado realizado');
  });
});

test.describe('@US22.01-CA13 A falta de dado numa característica não impede as demais', () => {
  test.use({ scenario: comDados });

  test('as outras características do repositório continuam com valor e situação', async ({ page }) => {
    await openRelease(page);
    await page.getByRole('tab', { name: 'MeasureSoftGram-Front' }).click();
    await expect(page.getByTestId('equalizer-norm-diff')).toHaveText('Diferença normalizada: 0.30');
    await expect(rowCells(page, 'vector-rd')).toHaveText(['0.80', 'Sem dado', '0.50', '0.10']);
    await expect(rowCells(page, 'vector-rc')).toHaveText(['0.00', '—', '0.00', '0.30']);
    await expect(rowCells(page, 'vector-status')).toHaveText([
      '▲ Acima do planejado',
      '— Sem dado realizado',
      '= Igual ao planejado',
      '▼ Abaixo do planejado'
    ]);
    await expectCurveDrawn(page.getByTestId('equalizer-curve-accomplished'));
  });
});
