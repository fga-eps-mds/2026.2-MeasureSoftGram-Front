import { Page, Request } from '@playwright/test';
import { expect, test } from './support/fixtures';
import { serverError } from './support/api';
import { PRODUCT_PATH } from './fixtures/common';
import * as produto from './fixtures/produto';
import { faixaA085, QUALITY_BANDS_API, reguaA085, reguaPadrao, SETTINGS_PATH, somenteLeitura } from './fixtures/faixas';

/** As 5 faixas da pior para a melhor, com as cores do guia de IDV (src/shared/utils/qualityBands.ts). */
const BANDS = [
  { grade: 'E', label: 'E · Muito ruim', color: 'rgb(190, 46, 14)' },
  { grade: 'D', label: 'D · Ruim', color: 'rgb(241, 97, 65)' },
  { grade: 'C', label: 'C · Bom', color: 'rgb(235, 161, 51)' },
  { grade: 'B', label: 'B · Muito bom', color: 'rgb(13, 200, 137)' },
  { grade: 'A', label: 'A · Ótimo', color: 'rgb(4, 114, 77)' }
];
const SAVED = 'Faixas salvas';
const SAVE_ERROR = 'Não foi possível salvar as faixas. Tente novamente.';

const panel = (page: Page) => page.getByRole('tabpanel');
const rows = (page: Page) => page.getByTestId(/^quality-band-[A-E]$/);
const ruler = (page: Page) => page.getByRole('img', { name: /^Régua das faixas: / });
/** O campo "Até" de uma faixa; a faixa A não tem, porque termina sempre em 1. */
const limitField = (page: Page, label: string) => page.getByRole('textbox', { name: `Até da faixa ${label}` });
const start = (page: Page, grade: string) => page.getByTestId(`band-start-${grade}`);
const saveButton = (page: Page) => panel(page).getByRole('button', { name: 'Salvar', exact: true });
const restoreButton = (page: Page) => panel(page).getByRole('button', { name: 'Restaurar padrão', exact: true });
/** O quadrado da cor, antes do nome da faixa: o único div aria-hidden da linha (o contorno do campo é um fieldset). */
const swatch = (page: Page, grade: string) =>
  page.getByTestId(`quality-band-${grade}`).locator('div[aria-hidden="true"]');

const isWrite = (request: Request) => request.url().includes('/quality-bands/') && request.method() !== 'GET';

/** Abre a aba e espera a régua carregar: o "De" da faixa A só aparece com as faixas em mãos. */
async function openSettings(page: Page) {
  await page.goto(SETTINGS_PATH);
  await expect(page.getByRole('tab', { name: 'Faixas de qualidade' })).toHaveAttribute('aria-selected', 'true');
  await expect(start(page, 'A')).toBeVisible();
}

test.describe('@US30.01-CA1 Aba "Faixas de qualidade" com as 5 faixas, a régua de 0 a 1 e os valores padrão', () => {
  test('o item "Configurações" do menu abre a aba "Faixas de qualidade"', async ({ page }) => {
    await page.goto(`${PRODUCT_PATH}/`);
    await page.getByText('Configurações', { exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/?$/);
    await expect(page.getByRole('tab', { name: 'Faixas de qualidade' })).toHaveAttribute('aria-selected', 'true');
  });

  test('as 5 faixas da pior para a melhor, cada uma com a cor, o nome e os limites padrão', async ({ page }) => {
    await openSettings(page);
    await expect(rows(page)).toHaveCount(5);
    await expect(rows(page)).toContainText(BANDS.map((band) => band.label));
    await Promise.all(
      BANDS.map(({ grade, color }) => expect(swatch(page, grade)).toHaveCSS('background-color', color))
    );
    await expect(page.getByTestId(/^band-start-/)).toHaveText(['0,00', '0,20', '0,40', '0,60', '0,80']);
    await Promise.all(
      ['0,20', '0,40', '0,60', '0,80'].map((value, index) =>
        expect(limitField(page, BANDS[index].label)).toHaveValue(value)
      )
    );
    await expect(page.getByTestId('band-end-A')).toHaveText('1,00');
  });

  test('a régua de 0 a 1 mostra o trecho de cada faixa', async ({ page }) => {
    await openSettings(page);
    await expect(ruler(page)).toHaveAccessibleName(
      'Régua das faixas: E de 0,00 a 0,20, D de 0,20 a 0,40, C de 0,40 a 0,60, B de 0,60 a 0,80, A de 0,80 a 1,00'
    );
    await expect(page.getByTestId(/^ruler-segment-/)).toHaveText(['E', 'D', 'C', 'B', 'A']);
  });
});

test.describe('@US30.01-CA2 O administrador altera um limite e salva', () => {
  test('o fim de uma faixa é o início da seguinte, e a régua muda enquanto ele digita', async ({ page }) => {
    await openSettings(page);
    await limitField(page, 'B · Muito bom').fill('0,85');
    await expect(start(page, 'A')).toHaveText('0,85');
    await expect(ruler(page)).toHaveAccessibleName(/B de 0,60 a 0,85, A de 0,85 a 1,00$/);
  });

  test('ao salvar aparece "Faixas salvas", e os limites continuam lá ao recarregar', async ({ page, api }) => {
    await openSettings(page);
    await limitField(page, 'B · Muito bom').fill('0,85');
    // o Service passa a guardar a régua nova: o PUT e as próximas leituras respondem com ela
    api.set(QUALITY_BANDS_API, reguaA085);
    const [request] = await Promise.all([page.waitForRequest(isWrite), saveButton(page).click()]);
    expect(request.method()).toBe('PUT');
    expect(request.postDataJSON()).toEqual({ bands: reguaA085.bands });
    await expect(page.getByText(SAVED)).toBeVisible();

    await page.reload();
    await expect(limitField(page, 'B · Muito bom')).toHaveValue('0,85');
    await expect(start(page, 'A')).toHaveText('0,85');
  });
});

test.describe('@US30.01-CA3 Limite inválido mostra a mensagem no campo e desabilita o "Salvar"', () => {
  test('um limite menor ou igual ao da faixa anterior', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => isWrite(request) && writes.push(request.method()));
    await openSettings(page);

    const field = limitField(page, 'D · Ruim');
    await field.fill('0,15');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(panel(page).getByText('O limite precisa ser maior que 0,20.')).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    await field.fill('0,20');
    await expect(panel(page).getByText('O limite precisa ser maior que 0,20.')).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();
    expect(writes).toEqual([]);
  });

  test('um limite fora do intervalo de 0 a 1', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (request) => isWrite(request) && writes.push(request.method()));
    await openSettings(page);

    const field = limitField(page, 'E · Muito ruim');
    await field.fill('1,20');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(panel(page).getByText('Use um valor entre 0 e 1.')).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();
    expect(writes).toEqual([]);
  });
});

test.describe('@US30.01-CA4 "Restaurar padrão" pede confirmação, volta aos valores padrão e salva', () => {
  test.use({ scenario: faixaA085 });

  test('"Cancelar" fecha a confirmação sem mudar nada', async ({ page }) => {
    await openSettings(page);
    await restoreButton(page).click();
    const dialog = page.getByRole('dialog', { name: 'Restaurar os limites padrão?' });
    await expect(dialog).toContainText('Os limites entre as faixas voltam a 0,20, 0,40, 0,60 e 0,80');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
    await expect(limitField(page, 'B · Muito bom')).toHaveValue('0,85');
  });

  test('confirmado, volta aos valores padrão e salva', async ({ page, api }) => {
    await openSettings(page);
    await expect(limitField(page, 'B · Muito bom')).toHaveValue('0,85');
    await restoreButton(page).click();
    api.set(QUALITY_BANDS_API, reguaPadrao);
    const dialog = page.getByRole('dialog', { name: 'Restaurar os limites padrão?' });
    const [request] = await Promise.all([
      page.waitForRequest(isWrite),
      dialog.getByRole('button', { name: 'Restaurar padrão' }).click()
    ]);
    expect(request.method()).toBe('DELETE');
    await expect(page.getByText(SAVED)).toBeVisible();
    await expect(limitField(page, 'B · Muito bom')).toHaveValue('0,80');
    await expect(restoreButton(page)).toBeDisabled();
  });
});

test.describe('@US30.01-CA5 Quem não é administrador vê as faixas sem poder editar', () => {
  test.use({ scenario: somenteLeitura });

  test('os limites atuais aparecem, sem campos editáveis e sem "Salvar" e "Restaurar padrão"', async ({ page }) => {
    await openSettings(page);
    await expect(page.getByTestId(/^band-end-/)).toHaveText(['0,20', '0,40', '0,60', '0,85', '1,00']);
    await expect(start(page, 'A')).toHaveText('0,85');
    await expect(panel(page).getByRole('textbox')).toHaveCount(0);
    await expect(saveButton(page)).toHaveCount(0);
    await expect(restoreButton(page)).toHaveCount(0);
    await expect(panel(page)).toContainText('Só o administrador da organização altera os limites.');
  });
});

test.describe('@US30.01-CA6 Falha ao salvar: a mensagem do guia de IDV e os valores digitados ficam', () => {
  test.use({ scenario: produto.comDados });

  test('aparece o erro, o que foi digitado continua na tela e os gráficos não mudam', async ({ page, api }) => {
    await openSettings(page);
    await limitField(page, 'B · Muito bom').fill('0,85');
    api.set(QUALITY_BANDS_API, serverError);
    await saveButton(page).click();

    const error = page.getByRole('alert').filter({ hasText: SAVE_ERROR });
    await expect(error).toHaveAttribute('data-severity', 'error');
    await expect(error).not.toContainText(/500|Erro interno|Request failed/);
    await expect(limitField(page, 'B · Muito bom')).toHaveValue('0,85');
    await expect(start(page, 'A')).toHaveText('0,85');

    // o Service não gravou nada: o pulso da Visão Geral continua com a faixa A a partir de 0,80
    api.set(QUALITY_BANDS_API, reguaPadrao);
    await page.goto(produto.PRODUTO_PATH);
    await expect(page.getByText('A · Ótimo (0,80 a 1,00)', { exact: true })).toBeVisible();
  });
});

test.describe('@US30.01-CA7 As cores e os nomes das faixas não são editáveis e seguem o guia de IDV', () => {
  test('só os limites são campos; as cores e os nomes são os do guia de IDV', async ({ page }) => {
    await openSettings(page);
    const fields = panel(page).getByRole('textbox');
    await expect(fields).toHaveCount(4);
    // um "Até" por faixa, na ordem delas; a faixa A termina sempre em 1 e não tem campo
    await Promise.all(
      BANDS.slice(0, -1).map((band, index) =>
        expect(fields.nth(index)).toHaveAccessibleName(`Até da faixa ${band.label}`)
      )
    );
    await expect(rows(page)).toContainText(BANDS.map((band) => band.label));
    await Promise.all(
      BANDS.map(({ grade, color }) => expect(swatch(page, grade)).toHaveCSS('background-color', color))
    );
  });
});
