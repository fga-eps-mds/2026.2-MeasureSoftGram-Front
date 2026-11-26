import { Page } from '@playwright/test';
import { expect, test } from './support/fixtures';
import {
  CONFIG_API,
  gravacoes,
  planejamentoComPesos,
  RELEASE_CREATE_PATH,
  RELEASES_LIST_PATH,
  simulaPrevia
} from './fixtures/pesos-ahp';

/**
 * US13.01 (DOC#276, front na #287): pesos por comparação (AHP) no planejamento da release. Os CAs seguem a
 * numeração das legendas do protótipo (Figma, fluxos 1 a 4). O cálculo dos pesos e do CR é do Core, chamado pelo
 * Service: aqui a prévia é simulada com os vetores de referência da US13.02, e a paridade com a CLI fica nos testes do
 * Service. O uso dos pesos no TSQMI e o registro com autor e data também são do Service.
 */
test.use({ scenario: planejamentoComPesos });

const avancar = (page: Page) => page.getByRole('button', { name: 'Avançar', exact: true });
const proximoGrupo = (page: Page) => page.getByRole('button', { name: 'Próximo grupo', exact: true });
const progresso = (page: Page) => page.getByText(/^Grupo \d+ de \d+$/);
const breadcrumb = (page: Page, etapa: string) => page.getByRole('button', { name: etapa, exact: true });

async function abrirPlanejamento(page: Page, pontoDePartida = 'Definir novos pesos') {
  await page.goto(RELEASE_CREATE_PATH);
  await expect(page.getByRole('heading', { name: 'Selecionar Repositórios da Release' })).toBeVisible();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await avancar(page).click();

  await page.getByTestId('apelido-release').fill('Release 2026.3 — Sprint 5');
  await page.getByLabel(pontoDePartida, { exact: true }).check();
}

async function irParaDefinirPesos(page: Page) {
  await abrirPlanejamento(page);
  await avancar(page).click();
  await expect(page.getByRole('heading', { name: 'Definir Características Utilizadas' })).toBeVisible();
  await avancar(page).click();
  await expect(page.getByText('Escolha a forma de definir os pesos desta release.')).toBeVisible();
}

async function irParaComparacao(page: Page) {
  await irParaDefinirPesos(page);
  await expect(page.getByLabel('Qualitativa — Por comparação (AHP)')).toBeChecked();
  await avancar(page).click();
  await expect(progresso(page)).toHaveText('Grupo 1 de 8');
}

async function responder(page: Page, a: string, b: string, escolha: string, intensidade?: string) {
  const par = page.getByTestId(`pair-${a}-${b}`);
  await par.getByLabel(escolha, { exact: true }).check();
  if (intensidade) {
    await par.getByRole('combobox').click();
    await page.getByRole('option', { name: intensidade, exact: true }).click();
  }
}

const RESUMO = 'Resumo dos pesos da release';
/** A lista de releases, com ou sem a barra final. */
const LISTA_DE_RELEASES = new RegExp(`${RELEASES_LIST_PATH.replace(/\/$/, '')}/?$`);

/** Responde "igualmente" aos pares ainda sem resposta, aceita o CR alto se for o caso e passa de grupo até o resumo. */
async function concluirComparacao(page: Page) {
  for (let guarda = 0; guarda < 12; guarda++) {
    if (await page.getByRole('heading', { name: RESUMO }).isVisible()) return;

    // a lista encolhe a cada resposta: sempre o primeiro par ainda sem resposta
    const semResposta = page.locator('[data-testid^="pair-"]').filter({ hasText: 'Sem resposta' });
    while ((await semResposta.count()) > 0) {
      await semResposta.first().getByLabel('igualmente importantes', { exact: true }).check();
    }
    const aceitar = page.getByRole('button', { name: 'Aceitar mesmo assim' });
    if (await aceitar.isVisible()) await aceitar.click();

    const antes = await progresso(page).textContent();
    const botao = page.getByRole('button', { name: /^(Próximo grupo|Avançar)$/ });
    await expect(botao).toBeEnabled();
    await botao.click();
    await expect(page.getByText(antes ?? '', { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { name: RESUMO })).toBeVisible();
}

const resumoDoGrupo = (page: Page, path: string) => page.getByTestId(`summary-group-${path}`);

async function finalizar(page: Page) {
  await expect(page.getByRole('heading', { name: 'Definir Valores de Referência' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page).toHaveURL(LISTA_DE_RELEASES);
}

test.describe('@US13.01-CA1 Comparação em andamento: a prévia espera todos os pares do grupo', () => {
  test('mostra quantos pares faltam e não deixa passar de grupo', async ({ page }) => {
    const previas = await simulaPrevia(page);
    await irParaComparacao(page);

    await expect(page.getByRole('heading', { name: 'Características' })).toBeVisible();
    await responder(page, 'reliability', 'maintainability', 'igualmente importantes');
    await responder(page, 'reliability', 'functional_suitability', 'Confiabilidade', 'moderadamente mais importante');

    await expect(
      page.getByText('A prévia dos pesos aparece quando as 3 comparações forem respondidas (2 de 3).')
    ).toBeVisible();
    await expect(page.getByTestId('pair-maintainability-functional_suitability')).toContainText('Sem resposta');
    await expect(proximoGrupo(page)).toBeDisabled();
    expect(previas).toHaveLength(0);
  });
});

test.describe('@US13.01-CA2 Grupo concluído: prévia com o CR e os pesos antes → depois', () => {
  test('pede a prévia ao Service com as respostas no formato do Core e mostra 43 / 43 / 14 com CR 0,00', async ({
    page
  }) => {
    const previas = await simulaPrevia(page);
    const gravado = gravacoes(page);
    await irParaComparacao(page);

    await responder(page, 'reliability', 'maintainability', 'igualmente importantes');
    await responder(page, 'reliability', 'functional_suitability', 'Confiabilidade', 'moderadamente mais importante');
    await responder(
      page,
      'maintainability',
      'functional_suitability',
      'Manutenibilidade',
      'moderadamente mais importante'
    );

    await expect(page.getByText('Consistência: CR 0,00')).toBeVisible();
    await expect(page.getByText('As respostas deste grupo são coerentes entre si.')).toBeVisible();
    await expect(page.getByTestId('preview-row-reliability')).toContainText(/Confiabilidade\s*34\s*→\s*43.*\+9/);
    await expect(page.getByTestId('preview-row-functional_suitability')).toContainText(
      /Adequação Funcional\s*33\s*→\s*14.*-19/
    );

    expect(previas.at(-1)).toEqual({
      entities: ['reliability', 'maintainability', 'functional_suitability'],
      answers: [
        { a: 'reliability', b: 'maintainability', preferred: null, intensity: 'igual' },
        { a: 'reliability', b: 'functional_suitability', preferred: 'reliability', intensity: 'moderadamente' },
        { a: 'maintainability', b: 'functional_suitability', preferred: 'maintainability', intensity: 'moderadamente' }
      ]
    });
    await expect(proximoGrupo(page)).toBeEnabled();
    // a prévia não grava nada
    expect(gravado).toEqual([]);
  });
});

test.describe('@US13.01-CA3 Resumo dos pesos: como cada grupo foi definido, e Avançar leva ao balanceamento', () => {
  test('mostra os selos dos grupos e grava a configuração com as comparações ao finalizar', async ({ page }) => {
    await simulaPrevia(page);
    const gravado = gravacoes(page);
    await irParaComparacao(page);

    await responder(page, 'reliability', 'maintainability', 'igualmente importantes');
    await responder(page, 'reliability', 'functional_suitability', 'Confiabilidade', 'moderadamente mais importante');
    await responder(
      page,
      'maintainability',
      'functional_suitability',
      'Manutenibilidade',
      'moderadamente mais importante'
    );
    await concluirComparacao(page);

    await expect(resumoDoGrupo(page, 'characteristics')).toContainText('Qualitativa (AHP) · CR 0,00');
    await expect(resumoDoGrupo(page, 'characteristics')).toContainText(
      'Confiabilidade 43 · Manutenibilidade 43 · Adequação Funcional 14'
    );
    await expect(resumoDoGrupo(page, 'maintainability/subcharacteristics')).toContainText('Peso único');
    await expect(breadcrumb(page, 'Definir pesos')).toBeVisible();

    await avancar(page).click();
    await finalizar(page);

    const config = gravado.find((write) => write.path === CONFIG_API);
    expect(config?.body.comparisons.map((comparison: { group_path: string }) => comparison.group_path)).toEqual([
      'characteristics',
      'reliability/subcharacteristics',
      'reliability/testing_status/measures',
      'maintainability/modifiability/measures'
    ]);
    expect(config?.body.data.characteristics.map((c: { weight: number }) => c.weight)).toEqual([43, 43, 14]);
  });
});

test.describe('@US13.01-CA4 Grupo com uma única entidade: peso 100, sem perguntas', () => {
  test('mostra o peso 100 sem comparação, e "Próximo grupo" pula os grupos de uma entidade', async ({ page }) => {
    await simulaPrevia(page);
    await irParaComparacao(page);

    await page.getByTestId('group-chip-maintainability/subcharacteristics').click();
    await expect(progresso(page)).toHaveText('Grupo 3 de 8');
    await expect(
      page.getByText('Grupo com uma única entidade: Modificabilidade fica com peso 100, sem comparações.')
    ).toBeVisible();
    await expect(page.getByText('Qual é mais importante para esta release?')).toHaveCount(0);

    await page.getByTestId('group-chip-reliability/subcharacteristics').click();
    await responder(page, 'testing_status', 'maturity', 'igualmente importantes');
    await expect(proximoGrupo(page)).toBeEnabled();
    await proximoGrupo(page).click();
    await expect(progresso(page)).toHaveText('Grupo 5 de 8');
  });
});

test.describe('@US13.01-CA5 Respostas contraditórias: CR acima de 0,10, revisar ou aceitar', () => {
  test('avisa o CR e o ciclo, só libera após aceitar e mostra o aceite no resumo', async ({ page }) => {
    await simulaPrevia(page);
    await irParaComparacao(page);
    await page.getByTestId('group-chip-reliability/testing_status/measures').click();

    await responder(page, 'passed_tests', 'test_builds', 'Testes Passados', 'muito fortemente mais importante');
    await responder(page, 'passed_tests', 'test_coverage', 'Cobertura de Testes', 'muito fortemente mais importante');
    await responder(page, 'test_builds', 'test_coverage', 'Builds de Teste', 'muito fortemente mais importante');

    await expect(page.getByText('Consistência: CR 4,95 (acima de 0,10)')).toBeVisible();
    await expect(
      page.getByText(
        'As respostas se contradizem: Testes Passados > Builds de Teste > Cobertura de Testes > Testes Passados.'
      )
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revisar respostas' })).toBeVisible();
    await expect(proximoGrupo(page)).toBeDisabled();

    await page.getByRole('button', { name: 'Aceitar mesmo assim' }).click();
    await expect(page.getByText('Aceito com CR 4,95 (acima do limite)')).toBeVisible();
    await expect(proximoGrupo(page)).toBeEnabled();

    await page.getByTestId('group-chip-characteristics').click();
    await concluirComparacao(page);
    await expect(resumoDoGrupo(page, 'reliability/testing_status/measures')).toContainText(
      'Qualitativa (AHP) · aceito com CR 4,95'
    );
  });
});

test.describe('@US13.01-CA6 Quantitativa: porcentagens como hoje, sem comparação registrada', () => {
  test('o resumo mostra "Quantitativa" e a configuração vai sem comparações', async ({ page }) => {
    const gravado = gravacoes(page);
    await irParaDefinirPesos(page);
    await page.getByLabel('Quantitativa — Informar porcentagens').check();
    await avancar(page).click();
    await expect(page.getByRole('heading', { name: 'Definir Características e Pesos Utilizados' })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    await avancar(page).click();
    await expect(page.getByRole('heading', { name: RESUMO })).toBeVisible();
    await expect(resumoDoGrupo(page, 'characteristics')).toContainText('Quantitativa');
    await expect(resumoDoGrupo(page, 'reliability/maturity/measures')).toContainText('Peso único');

    await avancar(page).click();
    await finalizar(page);
    const config = gravado.find((write) => write.path === CONFIG_API);
    expect(config?.body).not.toHaveProperty('comparisons');
    expect(config?.body.data.characteristics.map((c: { weight: number }) => c.weight)).toEqual([34, 33, 33]);
  });
});

test.describe('@US13.01-CA7 Entidades mudaram depois de comparar: a comparação é pedida de novo', () => {
  test('descarta as respostas do grupo, avisa o que mudou e tira os grupos da entidade removida', async ({ page }) => {
    await simulaPrevia(page);
    await irParaComparacao(page);
    await responder(page, 'reliability', 'maintainability', 'igualmente importantes');
    await responder(page, 'reliability', 'functional_suitability', 'igualmente importantes');
    await responder(page, 'maintainability', 'functional_suitability', 'igualmente importantes');
    await expect(page.getByText('Consistência: CR 0,00')).toBeVisible();

    await breadcrumb(page, 'Definir entidades').click();
    await page.getByLabel('Adequação Funcional', { exact: true }).uncheck();
    await avancar(page).click();
    await avancar(page).click();

    await expect(progresso(page)).toHaveText('Grupo 1 de 6');
    await expect(page.getByText('A seleção deste grupo mudou')).toBeVisible();
    await expect(
      page.getByText('Adequação Funcional saiu em Definir entidades. Responda à comparação de novo.')
    ).toBeVisible();
    await expect(page.getByTestId('pair-reliability-maintainability')).toContainText('Sem resposta');
    await expect(page.getByTestId('group-chip-characteristics')).toHaveAttribute('data-tone', 'current');
    await expect(page.getByTestId('group-chip-functional_suitability/subcharacteristics')).toHaveCount(0);
    await expect(proximoGrupo(page)).toBeDisabled();
  });
});

test.describe('@US13.01-CA8 Sair sem salvar: confirma a saída e não grava nada', () => {
  test('pelo menu, "Voltar" continua no planejamento e "Sair sem salvar" sai sem gravar', async ({ page }) => {
    const gravado = gravacoes(page);
    await irParaDefinirPesos(page);
    const releasesNoMenu = page.getByTestId('side-menu').getByText('Releases', { exact: true });

    await releasesNoMenu.click();
    const aviso = 'Ao sair, as respostas das comparações e a configuração desta release não serão gravadas.';
    await expect(page.getByText(aviso)).toBeVisible();
    await page.getByTestId('dismissBtnClick').click();
    await expect(page.getByText(aviso)).toHaveCount(0);
    await expect(page).toHaveURL(/\/releases\/create\/?$/);

    await releasesNoMenu.click();
    await page.getByRole('button', { name: 'Sair sem salvar' }).click();
    await expect(page).toHaveURL(LISTA_DE_RELEASES);
    expect(gravado).toEqual([]);
  });
});

test.describe('@US13.01-CA9 Soma diferente de 100: mensagem de erro e Avançar bloqueado', () => {
  test('mostra quantos pontos sobram e libera quando a soma volta a 100', async ({ page }) => {
    await irParaDefinirPesos(page);
    await page.getByLabel('Quantitativa — Informar porcentagens').check();
    await avancar(page).click();

    const confiabilidade = page.getByRole('spinbutton').first();
    await confiabilidade.fill('44');
    await expect(page.getByText('A soma dos pesos das características é 110%')).toBeVisible();
    await expect(
      page.getByText('Ajuste os valores para que a soma seja 100%. Hoje há 10 pontos a mais.')
    ).toBeVisible();
    await expect(avancar(page)).toBeDisabled();

    await confiabilidade.fill('34');
    await expect(page.getByText('A soma dos pesos das características é 110%')).toHaveCount(0);
    await expect(avancar(page)).toBeEnabled();
  });
});

test.describe('@US13.01-CA10 Última configuração: vai direto ao balanceamento', () => {
  test('descreve a última configuração, compara com o padrão e não regrava a configuração', async ({ page }) => {
    const gravado = gravacoes(page);
    await abrirPlanejamento(page, 'Última configuração');

    const cartao = page.getByTestId('starting-point-last');
    await expect(cartao).toContainText('Pesos definidos manualmente');
    await expect(cartao).toContainText(
      'Características: Confiabilidade 43 · Manutenibilidade 43 · Adequação Funcional 14'
    );
    await expect(breadcrumb(page, 'Definir entidades')).toHaveCount(0);
    await expect(breadcrumb(page, 'Definir pesos')).toHaveCount(0);

    await page.getByRole('button', { name: 'Ver os pesos da última configuração e do padrão' }).click();
    await expect(page.getByText('Característica › Sub-característica › Medida')).toBeVisible();
    const confiabilidade = page.getByTestId('comparison-row-reliability').getByRole('cell');
    await expect(confiabilidade.nth(1)).toHaveText('43');
    await expect(confiabilidade.nth(1)).toHaveCSS('font-weight', '700');
    await expect(confiabilidade.nth(2)).toHaveText('34');
    await expect(page.getByTestId('comparison-row-reliability').getByRole('img', { name: 'Difere' })).toBeVisible();
    await expect(page.getByTestId('comparison-row-test_builds').getByRole('img')).toHaveCount(0);

    await avancar(page).click();
    await finalizar(page);
    expect(gravado.map((write) => write.path)).not.toContain(CONFIG_API);
    expect(gravado.map((write) => write.path)).toHaveLength(2);
  });
});

test.describe('@US13.01-CA11 Padrão do MeasureSoftGram: vai direto ao balanceamento', () => {
  test('destaca o padrão na tabela e grava a configuração padrão', async ({ page }) => {
    const gravado = gravacoes(page);
    await abrirPlanejamento(page, 'Padrão do MeasureSoftGram');

    await expect(page.getByTestId('starting-point-default')).toContainText(
      'Pesos proporcionalmente iguais entre as entidades'
    );
    await page.getByRole('button', { name: 'Ver os pesos da última configuração e do padrão' }).click();
    const confiabilidade = page.getByTestId('comparison-row-reliability').getByRole('cell');
    await expect(confiabilidade.nth(2)).toHaveCSS('font-weight', '700');
    await expect(confiabilidade.nth(1)).toHaveCSS('font-weight', '400');

    await avancar(page).click();
    await finalizar(page);
    const config = gravado.find((write) => write.path === CONFIG_API);
    expect(config?.body.data.characteristics.map((c: { weight: number }) => c.weight)).toEqual([34, 33, 33]);
    expect(config?.body).not.toHaveProperty('comparisons');
  });
});
